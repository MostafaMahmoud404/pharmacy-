const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const Product = require("../models/Product");
const crypto = require("crypto");
const axios = require("axios");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
} = require("../middleware/errorHandler");

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate cart total deterministically
 */
function calculateCartTotal(cartItems) {
  if (!cartItems || !cartItems.length) return 0;

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const tax = subtotal * 0.14; // 14%
  const delivery = 30; // Fixed delivery fee
  const serviceFee = subtotal * 0.02; // 2%

  return Math.round((subtotal + tax + delivery + serviceFee) * 100) / 100;
}

/**
 * Get Paymob auth token
 */
async function getPaymobAuthToken() {
  try {
    const response = await axios.post(
      `${process.env.PAYMOB_BASE_URL}/auth/tokens`,
      { api_key: process.env.PAYMOB_API_KEY }
    );
    return response.data.token;
  } catch (error) {
    throw new Error(`Paymob auth failed: ${error.message}`);
  }
}

/**
 * Create Paymob order
 */
async function createPaymobOrder(authToken, amountCents, merchantOrderId) {
  try {
    const response = await axios.post(
      `${process.env.PAYMOB_BASE_URL}/ecommerce/orders`,
      {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        merchant_order_id: merchantOrderId,
        items: []
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Paymob order creation failed: ${error.message}`);
  }
}

/**
 * Create Paymob payment key
 */
async function createPaymobPaymentKey(authToken, orderId, amountCents, billingData) {
  try {
    const response = await axios.post(
      `${process.env.PAYMOB_BASE_URL}/acceptance/payment_keys`,
      {
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
        currency: 'EGP',
        billing_data: billingData
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Paymob payment key creation failed: ${error.message}`);
  }
}

// ========================================
// CASH ON DELIVERY
// ========================================

/**
 * @desc    Process Cash on Delivery Payment
 * @route   POST /api/v1/payments/cash
 * @access  Private/Customer
 */
const processCashPayment = asyncHandler(async (req, res, next) => {
  // 1. Get user's cart from DB
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || !cart.items || cart.items.length === 0) {
    return next(new ErrorResponse('السلة فارغة', 400));
  }

  // 2. Calculate total (backend determines price - NOT client)
  const totalAmount = calculateCartTotal(cart.items);

  if (totalAmount <= 0) {
    return next(new ErrorResponse('خطأ في حساب المجموع', 400));
  }

  // 3. Get user's shipping address
  const user = await User.findById(req.user._id);
  if (!user || !user.address) {
    return next(new ErrorResponse('عنوان الشحن غير موجود', 400));
  }

  // 4. Snapshot pricing - save current prices
  const orderItems = cart.items.map(item => ({
    product: item.product._id,
    quantity: item.quantity,
    price: item.price, // Snapshot current price
    name: item.product.name,
    subtotal: item.price * item.quantity
  }));

  // 5. Calculate pricing breakdown
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.round(subtotal * 0.14 * 100) / 100;
  const deliveryFee = 30;
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

  // 6. Create order with proper schema structure
  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    pricing: {
      subtotal,
      deliveryFee,
      tax,
      total
    },
    deliveryAddress: user.address,
    payment: {
      method: 'cash',
      status: 'pending' // Will be 'paid' when delivered
    },
    status: 'confirmed',
    metadata: {
      source: 'web'
    }
  });

  // 7. Clear cart after successful order creation
  await Cart.deleteOne({ user: req.user._id });

  // 8. Update product stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, salesCount: item.quantity }
    });
  }

  successResponse(res, 201, 'تم إنشاء الطلب بنجاح', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    totalAmount: total
  });
});

// ========================================
// PAYMOB PAYMENT
// ========================================

/**
 * @desc    Create Paymob Payment Token (Card Payment)
 * @route   POST /api/v1/payments/paymob/create-token
 * @access  Private/Customer
 */
const createPaymobToken = asyncHandler(async (req, res, next) => {
  // Validate Paymob credentials
  if (!process.env.PAYMOB_API_KEY || !process.env.PAYMOB_INTEGRATION_ID) {
    return next(new ErrorResponse('Paymob غير مفعل', 400));
  }

  console.log('🔍 Creating Paymob payment for user:', req.user._id);

  // 1. Get user's cart from DB
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || !cart.items || cart.items.length === 0) {
    return next(new ErrorResponse('السلة فارغة. يرجى إضافة منتجات أولاً', 400));
  }

  console.log(`✅ Found cart with ${cart.items.length} items`);

  // 2. Calculate total (backend determines price)
  const totalAmount = calculateCartTotal(cart.items);
  const amountCents = Math.round(totalAmount * 100); // Convert to cents

  console.log(`💰 Total amount: ${totalAmount} EGP (${amountCents} cents)`);

  if (amountCents <= 0) {
    return next(new ErrorResponse('خطأ في حساب المجموع', 400));
  }

  // 3. Get user's shipping address
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorResponse('المستخدم غير موجود', 404));
  }

  console.log(`✅ User found: ${user.name}`);

  // ✅ CRITICAL FIX: Create complete address with phone
  let deliveryAddress;
  if (user.address && user.address.phone) {
    deliveryAddress = user.address;
  } else {
    console.log('⚠️ No complete address found, creating default with phone');
    deliveryAddress = {
      street: user.address?.street || 'Default Street',
      city: user.address?.city || 'Cairo',
      state: user.address?.state || 'Cairo',
      zipCode: user.address?.zipCode || '12345',
      apartment: user.address?.apartment || 'NA',
      floor: user.address?.floor || 'NA',
      building: user.address?.building || 'NA',
      phone: user.phone || '+201000000000' // ✅ CRITICAL: Include phone
    };
  }

  // 4. Snapshot pricing
  const orderItems = cart.items.map(item => {
    if (!item.product) {
      throw new Error(`Product not found for cart item`);
    }

    return {
      product: item.product._id,
      quantity: item.quantity,
      price: item.price,
      name: item.product.name,
      subtotal: item.price * item.quantity
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.round(subtotal * 0.14 * 100) / 100;
  const deliveryFee = 30;
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

  console.log(`📊 Pricing breakdown - Subtotal: ${subtotal}, Tax: ${tax}, Delivery: ${deliveryFee}, Total: ${total}`);

  // 5. Generate unique orderNumber before creating order
  const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  console.log(`✅ Generated orderNumber: ${orderNumber}`);

  // Create order FIRST (before Paymob) with retry logic for duplicate orderNumber
  let order;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      order = await Order.create({
        customer: req.user._id,
        orderNumber,
        items: orderItems,
        pricing: {
          subtotal,
          deliveryFee,
          tax,
          total
        },
        deliveryAddress, // ✅ This now includes phone
        payment: {
          method: 'card',
          status: 'pending'
        },
        status: 'pending',
        metadata: {
          source: 'web'
        }
      });
      console.log(`✅ Order created successfully: ${order._id} with orderNumber: ${order.orderNumber}`);
      break; // Success, exit loop
    } catch (error) {
      if (error.code === 11000 && error.message.includes('orderNumber')) {
        console.warn(`⚠️ Duplicate orderNumber detected, retrying... (attempt ${attempts + 1})`);
        attempts++;
        if (attempts >= maxAttempts) {
          return next(new ErrorResponse('فشل في إنشاء الطلب بسبب تعارض في رقم الطلب', 500));
        }
      } else {
        // Other errors, re-throw
        return next(error);
      }
    }
  }

  const merchantOrderId = order._id.toString();

  // 6. Prepare billing data with defaults
  const billingData = {
    first_name: user.name?.split(' ')[0] || 'User',
    last_name: user.name?.split(' ')[1] || 'NA',
    email: user.email || 'noemail@example.com',
    phone_number: deliveryAddress.phone || user.phone || '+201000000000', // ✅ Use from address or user
    apartment: deliveryAddress.apartment || 'NA',
    floor: deliveryAddress.floor || 'NA',
    street: deliveryAddress.street || 'NA',
    building: deliveryAddress.building || 'NA',
    shipping_method: 'NA',
    postal_code: deliveryAddress.zipCode || 'NA',
    city: deliveryAddress.city || 'Cairo',
    country: 'EG',
    state: deliveryAddress.state || 'NA'
  };

  console.log(`📋 Billing data prepared for: ${billingData.first_name} ${billingData.last_name}`);

  try {
    console.log('🔐 Getting Paymob auth token...');
    // 7. Get Paymob auth token
    const authToken = await getPaymobAuthToken();
    console.log('✅ Auth token received');

    console.log('📦 Creating Paymob order...');
    // 8. Create Paymob order
    const paymobOrder = await createPaymobOrder(authToken, amountCents, merchantOrderId);
    console.log(`✅ Paymob order created: ${paymobOrder.id}`);

    console.log('🔑 Creating payment key...');
    // 9. Create payment key
    const paymentKey = await createPaymobPaymentKey(
      authToken,
      paymobOrder.id,
      amountCents,
      billingData
    );
    console.log('✅ Payment key created');

    // 10. Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }
    console.log('✅ Product stock updated');

    // 11. Clear cart
    await Cart.deleteOne({ user: req.user._id });
    console.log('✅ Cart cleared');

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey.token}`;
    console.log('🎉 Payment token created successfully');

    successResponse(res, 200, 'تم إنشاء رابط الدفع بنجاح', {
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      iframeUrl,
      paymentToken: paymentKey.token
    });

  } catch (error) {
    console.error('❌ Paymob error:', error);

    // If Paymob fails, delete the order and restore stock
    console.log('🔄 Rolling back order...');
    await Order.findByIdAndDelete(order._id);

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }
    console.log('✅ Rollback complete');

    return next(new ErrorResponse(`خطأ في Paymob: ${error.message}`, 500));
  }
});

/**
 * @desc    Paymob Callback Handler
 * @route   POST /api/v1/payments/paymob/callback
 * @access  Public
 */
const paymobCallback = asyncHandler(async (req, res, next) => {
  try {
    const data = req.body.obj;
    const receivedHmac = req.query.hmac;

    // ✅ CRITICAL: Verify HMAC signature
    // Must match exact order from Paymob docs
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
      data.owner,
      data.pending,
      data.source_data.pan,
      data.source_data.sub_type,
      data.source_data.type,
      data.success
    ].join("");

    const calculatedHmac = crypto
      .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
      .update(concatenated)
      .digest("hex");

    if (calculatedHmac !== receivedHmac) {
      console.error('❌ Invalid HMAC signature');
      return res.status(401).json({ message: "Invalid HMAC" });
    }

    // ✅ HMAC verified - process payment
    const orderId = data.order.merchant_order_id;
    const order = await Order.findById(orderId);

    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return res.sendStatus(404);
    }

    // ✅ Duplicate webhook protection
    if (order.payment.status === "paid") {
      console.log(`⚠️ Duplicate webhook for order: ${orderId}`);
      return res.sendStatus(200);
    }

    // ✅ Process payment result
    if (data.success === true) {
      order.payment.status = "paid";
      order.payment.transactionId = data.id.toString();
      order.payment.paidAt = new Date();
      order.status = "confirmed";

      console.log(`✅ Payment successful for order: ${orderId}`);
    } else {
      order.payment.status = "failed";
      order.status = "cancelled";

      // Restore stock on failed payment
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity, salesCount: -item.quantity }
        });
      }

      console.log(`❌ Payment failed for order: ${orderId}`);
    }

    await order.save();
    res.sendStatus(200);

  } catch (err) {
    console.error('Callback error:', err);
    res.sendStatus(500);
  }
});

/**
 * @desc    Get Payment Status
 * @route   GET /api/v1/payments/status/:orderId
 * @access  Private
 */
const getPaymentStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  // Validate orderId format
  if (!orderId || orderId.length !== 24) {
    return next(new ErrorResponse('معرف الطلب غير صحيح', 400));
  }

  const order = await Order.findById(orderId)
    .select('payment.status payment.method payment.transactionId payment.paidAt pricing.total createdAt');

  if (!order) {
    return next(new ErrorResponse('الطلب غير موجود', 404));
  }

  // Check authorization
  const isCustomer = order.customer && order.customer.toString() === req.user._id.toString();
  const isPharmacist = req.user.role === 'pharmacist';
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isPharmacist && !isAdmin) {
    return next(new ErrorResponse('غير مصرح لك بالوصول لهذا الطلب', 403));
  }

  successResponse(res, 200, 'حالة الدفع', {
    orderId: order._id,
    paymentStatus: order.payment.status, // 'pending', 'paid', 'failed'
    method: order.payment.method,
    transactionId: order.payment.transactionId || null,
    paidAt: order.payment.paidAt || null,
    totalAmount: order.pricing.total,
    createdAt: order.createdAt
  });
});

// ========================================
// GET PAYMENT METHODS
// ========================================

/**
 * @desc    Get Available Payment Methods
 * @route   GET /api/v1/payments/methods
 * @access  Private
 */
const getPaymentMethods = asyncHandler(async (req, res, next) => {
  const methods = [
    {
      id: 'cash',
      name: 'الدفع عند الاستلام',
      nameEn: 'Cash on Delivery',
      icon: '💵',
      enabled: true,
      fee: 0
    },
    {
      id: 'card',
      name: 'بطاقة ائتمان/خصم',
      nameEn: 'Credit/Debit Card',
      icon: '💳',
      enabled: !!(process.env.PAYMOB_API_KEY && process.env.PAYMOB_INTEGRATION_ID),
      fee: 0,
      provider: 'paymob'
    }
  ];

  successResponse(res, 200, 'طرق الدفع المتاحة', { methods });
});

module.exports = {
  processCashPayment,
  createPaymobToken,
  paymobCallback,
  getPaymentStatus,
  getPaymentMethods
};
