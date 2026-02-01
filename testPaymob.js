require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { getAuthToken, createPaymobOrder, createPaymentKey } = require('./src/utils/paymobService');
const Order = require('./src/models/Order');
const Cart = require('./src/models/Cart'); // ✅ استيراد Cart
const User = require('./src/models/User'); // ✅ استيراد User للـ address

const app = express();

// ✅ Middleware: Authentication (يجب أن تكون من auth middleware الحقيقي)
const protect = (req, res, next) => {
    // في التطبيق الفعلي، ده هيجي من middleware auth حقيقي
    // مثلاً: يتحقق من JWT token
    // للآن: mock user
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    next();
};

// ✅ Helper: حساب إجمالي السلة بشكل deterministic
function calculateCartTotal(cartItems) {
    if (!cartItems || !cartItems.length) return 0;

    // حساب subtotal
    const subtotal = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    // ✅ إضافة tax (14%)
    const tax = subtotal * 0.14;

    // ✅ تكلفة الشحن (ثابتة)
    const delivery = 30;

    // ✅ رسم الخدمة (2%)
    const serviceFee = subtotal * 0.02;

    // ✅ Rounding: تجنب floating point errors
    return Math.round((subtotal + tax + delivery + serviceFee) * 100) / 100;
}
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.get('/test-paymob', async (req, res) => {
    try {
        const authToken = await getAuthToken();
        res.json({ success: true, authToken });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/create-paymob-payment', async (req, res) => {
    try {
        const { amountCents } = req.body;

        // ✅ Validate required fields
        if (!amountCents || amountCents <= 0) {
            return res.status(400).json({
                success: false,
                error: 'amountCents صحيح مطلوب'
            });
        }

        // ✅ Backend ينشئ Order - ليس العميل
        const order = await Order.create({
            totalAmount: amountCents / 100, // تحويل من قرش إلى جنيه
            paymentStatus: 'pending',
            customer: req.user?._id || 'guest'
        });

        const merchantOrderId = order._id.toString();

        // ✅ Enforce billing data مع قيم افتراضية
        const billingData = req.body.billingData || {};
        const enforcedBillingData = {
            first_name: billingData.first_name || 'User',
            last_name: billingData.last_name || 'NA',
            email: billingData.email || 'noemail@example.com',
            phone_number: billingData.phone_number || '+201000000000',
            apartment: billingData.apartment || 'NA',
            floor: billingData.floor || 'NA',
            street: billingData.street || 'NA',
            building: billingData.building || 'NA',
            shipping_method: billingData.shipping_method || 'NA',
            postal_code: billingData.postal_code || 'NA',
            city: billingData.city || 'Cairo',
            country: billingData.country || 'EG',
            state: billingData.state || 'NA',
        };

        // 1️⃣ إنشاء order على Paymob
        const orderData = await createPaymobOrder(amountCents, merchantOrderId);

        // 2️⃣ إنشاء payment key
        const paymentKeyData = await createPaymentKey(orderData.id, amountCents, enforcedBillingData);

        res.json({
            success: true,
            orderId: merchantOrderId,
            iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKeyData.token}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Paymob Callback Handler مع التحقق من HMAC SHA512
app.post("/api/v1/payments/paymob/callback", async (req, res) => {
    try {
        const data = req.body.obj;
        const receivedHmac = req.query.hmac;

        // ✅ طريقة صحيحة: concatenate حقول محددة بترتيب معين
        const concatenated = [
            data.amount_cents,
            data.created_at,
            data.currency,
            data.error_occured,
            data.has_parent_transaction,
            data.id,
            data.integration_id,
            data.is_3d_secure,
            data.is_auth,
            data.is_capture,
            data.is_refunded,
            data.is_standalone_payment,
            data.is_voided,
            data.order.id,
            data.pending,
            data.success,
        ].join("");

        const calculatedHmac = crypto
            .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
            .update(concatenated)
            .digest("hex");

        if (calculatedHmac !== receivedHmac) {
            console.error('Invalid HMAC signature');
            return res.status(401).json({ message: "Invalid HMAC" });
        }

        // ✅ التوقيع صحيح - معالجة النتيجة
        const orderId = data.order.merchant_order_id;
        const order = await Order.findById(orderId);

        if (!order) {
            console.error(`Order not found: ${orderId}`);
            return res.sendStatus(404);
        }

        // ✅ Duplicate webhook protection
        if (order.paymentStatus === "paid") {
            console.log(`Duplicate webhook for order: ${orderId}`);
            return res.sendStatus(200);
        }

        // ✅ معالجة النجاح والفشل
        if (data.success) {
            order.paymentStatus = "paid";
            order.transactionId = data.id;
            order.paidAt = new Date();
            console.log(`✅ Payment successful for order: ${orderId}`);
        } else {
            order.paymentStatus = "failed";
            console.log(`❌ Payment failed for order: ${orderId}`);
        }

        await order.save();
        res.sendStatus(200);
    } catch (err) {
        console.error('Callback error:', err);
        res.sendStatus(500);
    }
});

// ✅ Cash Payment (الدفع النقدي) - الإصدار الصحيح
app.post('/api/v1/payments/cash', protect, async (req, res) => {
    try {
        // ✅ تاخد cart من DB بناءً على user الحالي
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

        // ✅ التحقق من وجود السلة والمنتجات
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        // ✅ حساب المجموع في backend (deterministic)
        const totalAmount = calculateCartTotal(cart.items);

        if (totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid cart total' });
        }

        // ✅ الحصول على عنوان الشحن من DB (user profile)
        const user = await User.findById(req.user._id);
        if (!user || !user.address) {
            return res.status(400).json({ success: false, message: 'Shipping address not found' });
        }

        // ✅ Snapshot pricing: احفظ السعر الحالي من cart (ليس reference)
        // هذا يضمن أنه لو السعر تغير لاحقًا، الطلب القديم يحافظ على السعر الأصلي
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price, // ✅ snapshot من السعر الحالي
            name: item.product.name,
            image: item.product.image
        }));

        // ✅ إنشاء Order مع snapshot data
        const order = await Order.create({
            items: orderItems,
            totalAmount: totalAmount,
            paymentStatus: 'cash_on_delivery', // ✅ TODO: استخدم enum في schema
            paymentMethod: 'cash',
            shippingAddress: user.address,
            customer: req.user._id
        });

        // ✅ Idempotency: امسح السلة فقط بعد إنشاء الطلب بنجاح
        // Frontend: يجب disable الزر بعد أول click
        // Backend (later): يمكن إضافة cartLock لمنع duplicate orders
        await Cart.deleteOne({ user: req.user._id });

        console.log(`✅ Cash order created: ${order._id}`);

        res.json({
            success: true,
            orderId: order._id,
            totalAmount: totalAmount
        });

    } catch (err) {
        console.error('Cash payment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ✅ Get Payment Status
app.get('/api/v1/payments/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // ✅ Validate orderId format
        if (!orderId || orderId.length !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order ID format'
            });
        }

        // ✅ Find order and return payment status
        const order = await Order.findById(orderId).select('paymentStatus totalAmount transactionId paidAt createdAt');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.json({
            success: true,
            orderId: order._id,
            paymentStatus: order.paymentStatus, // pending, paid, failed
            totalAmount: order.totalAmount,
            transactionId: order.transactionId || null,
            paidAt: order.paidAt || null,
            createdAt: order.createdAt
        });
    } catch (err) {
        console.error('Error fetching payment status:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
});