const Order = require("../models/Order");
const Consultation = require("../models/Consultation");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
} = require("../middleware/errorHandler");
const crypto = require("crypto");

// ========================================
// CASH ON DELIVERY
// ========================================

// @desc    Process Cash on Delivery
// @route   POST /api/payments/cash
// @access  Private/Customer
const processCashPayment = asyncHandler(async (req, res, next) => {
  const { orderId, consultationId } = req.body;

  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("الطلب غير موجود", 404));
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
    }

    order.payment.method = "cash";
    order.payment.status = "pending";
    order.status = "confirmed";
    await order.save();

    successResponse(res, 200, "تم تأكيد الطلب. سيتم الدفع عند الاستلام", {
      order,
    });
  } else if (consultationId) {
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new ErrorResponse("الاستشارة غير موجودة", 404));
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
    }

    consultation.payment.method = "cash";
    consultation.payment.status = "pending";
    consultation.status = "confirmed";
    await consultation.save();

    successResponse(res, 200, "تم تأكيد الاستشارة. سيتم الدفع نقداً", {
      consultation,
    });
  }
});

// ========================================
// STRIPE PAYMENT
// ========================================

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private/Customer
const createStripePaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId, consultationId } = req.body;

  // تحقق من وجود Stripe في المشروع
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new ErrorResponse("Stripe غير مفعل", 400));
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  let amount = 0;
  let description = "";
  let metadata = {};

  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("الطلب غير موجود", 404));
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
    }

    amount = Math.round(order.pricing.total * 100); // تحويل لـ cents
    description = `Order #${order.orderNumber}`;
    metadata = { orderId: order._id.toString(), type: "order" };
  } else if (consultationId) {
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new ErrorResponse("الاستشارة غير موجودة", 404));
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
    }

    amount = Math.round(consultation.payment.amount * 100);
    description = `Consultation #${consultation.consultationNumber}`;
    metadata = {
      consultationId: consultation._id.toString(),
      type: "consultation",
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "egp",
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    successResponse(res, 200, "Payment Intent تم إنشاؤه بنجاح", {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return next(new ErrorResponse(`خطأ في Stripe: ${error.message}`, 500));
  }
});

// @desc    Confirm Stripe Payment
// @route   POST /api/payments/stripe/confirm
// @access  Private/Customer
const confirmStripePayment = asyncHandler(async (req, res, next) => {
  const { paymentIntentId, orderId, consultationId } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new ErrorResponse("Stripe غير مفعل", 400));
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return next(new ErrorResponse("الدفع لم يتم بنجاح", 400));
    }

    if (orderId) {
      const order = await Order.findById(orderId);
      order.payment.method = "card";
      order.payment.status = "paid";
      order.payment.transactionId = paymentIntentId;
      order.payment.paidAt = new Date();
      order.status = "confirmed";
      await order.save();

      successResponse(res, 200, "تم الدفع بنجاح", { order });
    } else if (consultationId) {
      const consultation = await Consultation.findById(consultationId);
      consultation.payment.method = "card";
      consultation.payment.status = "paid";
      consultation.payment.transactionId = paymentIntentId;
      consultation.payment.paidAt = new Date();
      consultation.status = "confirmed";
      await consultation.save();

      successResponse(res, 200, "تم الدفع بنجاح", { consultation });
    }
  } catch (error) {
    return next(new ErrorResponse(`خطأ في تأكيد الدفع: ${error.message}`, 500));
  }
});

// ========================================
// PAYMOB PAYMENT (مصر)
// ========================================

// @desc    Create Paymob Payment Token
// @route   POST /api/payments/paymob/create-token
// @access  Private/Customer
const createPaymobToken = asyncHandler(async (req, res, next) => {
  const { orderId, consultationId } = req.body;

  if (!process.env.PAYMOB_API_KEY) {
    return next(new ErrorResponse("Paymob غير مفعل", 400));
  }

  const axios = require("axios");

  let amount = 0;
  let orderRef = "";

  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("الطلب غير موجود", 404));
    }
    amount = order.pricing.total * 100; // بالقرش
    orderRef = order.orderNumber;
  } else if (consultationId) {
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new ErrorResponse("الاستشارة غير موجودة", 404));
    }
    amount = consultation.payment.amount * 100;
    orderRef = consultation.consultationNumber;
  }

  try {
    // Step 1: Authentication
    const authResponse = await axios.post(
      "https://accept.paymob.com/api/auth/tokens",
      {
        api_key: process.env.PAYMOB_API_KEY,
      }
    );

    const authToken = authResponse.data.token;

    // Step 2: Order Registration
    const orderResponse = await axios.post(
      "https://accept.paymob.com/api/ecommerce/orders",
      {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amount,
        currency: "EGP",
        merchant_order_id: orderRef,
      }
    );

    const paymobOrderId = orderResponse.data.id;

    // Step 3: Payment Key
    const paymentKeyResponse = await axios.post(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      {
        auth_token: authToken,
        amount_cents: amount,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          apartment: "NA",
          email: req.user.email,
          floor: "NA",
          first_name: req.user.name,
          street: "NA",
          building: "NA",
          phone_number: req.user.phone,
          shipping_method: "NA",
          postal_code: "NA",
          city: "NA",
          country: "EG",
          last_name: "NA",
          state: "NA",
        },
        currency: "EGP",
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
      }
    );

    const paymentToken = paymentKeyResponse.data.token;

    successResponse(res, 200, "Payment Token تم إنشاؤه بنجاح", {
      paymentToken,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`,
    });
  } catch (error) {
    return next(new ErrorResponse(`خطأ في Paymob: ${error.message}`, 500));
  }
});

// @desc    Paymob Callback Handler
// @route   POST /api/payments/paymob/callback
// @access  Public
const paymobCallback = asyncHandler(async (req, res, next) => {
  const { obj } = req.body;

  // التحقق من HMAC
  const hmac = crypto
    .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
    .update(JSON.stringify(obj))
    .digest("hex");

  if (hmac !== req.query.hmac) {
    return next(new ErrorResponse("Invalid HMAC", 400));
  }

  if (obj.success === true) {
    const orderRef = obj.order.merchant_order_id;

    // تحديث الطلب أو الاستشارة
    const order = await Order.findOne({ orderNumber: orderRef });
    if (order) {
      order.payment.method = "card";
      order.payment.status = "paid";
      order.payment.transactionId = obj.id.toString();
      order.payment.paidAt = new Date();
      order.status = "confirmed";
      await order.save();
    }

    const consultation = await Consultation.findOne({
      consultationNumber: orderRef,
    });
    if (consultation) {
      consultation.payment.method = "card";
      consultation.payment.status = "paid";
      consultation.payment.transactionId = obj.id.toString();
      consultation.payment.paidAt = new Date();
      consultation.status = "confirmed";
      await consultation.save();
    }

    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ success: false, message: "Payment failed" });
  }
});

// ========================================
// WALLET PAYMENT (محفظة داخلية)
// ========================================

// @desc    Pay with Wallet
// @route   POST /api/payments/wallet
// @access  Private/Customer
const payWithWallet = asyncHandler(async (req, res, next) => {
  const { orderId, consultationId } = req.body;

  // جلب رصيد المحفظة (يحتاج Wallet Model)
  const user = await User.findById(req.user._id);

  let amount = 0;

  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("الطلب غير موجود", 404));
    }
    amount = order.pricing.total;

    if (user.walletBalance < amount) {
      return next(new ErrorResponse("رصيد المحفظة غير كافي", 400));
    }

    user.walletBalance -= amount;
    await user.save();

    order.payment.method = "wallet";
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
    order.status = "confirmed";
    await order.save();

    successResponse(res, 200, "تم الدفع من المحفظة بنجاح", {
      order,
      walletBalance: user.walletBalance,
    });
  } else if (consultationId) {
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new ErrorResponse("الاستشارة غير موجودة", 404));
    }
    amount = consultation.payment.amount;

    if (user.walletBalance < amount) {
      return next(new ErrorResponse("رصيد المحفظة غير كافي", 400));
    }

    user.walletBalance -= amount;
    await user.save();

    consultation.payment.method = "wallet";
    consultation.payment.status = "paid";
    consultation.payment.paidAt = new Date();
    consultation.status = "confirmed";
    await consultation.save();

    successResponse(res, 200, "تم الدفع من المحفظة بنجاح", {
      consultation,
      walletBalance: user.walletBalance,
    });
  }
});

// @desc    Get Payment Methods
// @route   GET /api/payments/methods
// @access  Private
const getPaymentMethods = asyncHandler(async (req, res, next) => {
  const methods = [
    {
      id: "cash",
      name: "الدفع عند الاستلام",
      nameEn: "Cash on Delivery",
      icon: "💵",
      enabled: true,
      fee: 0,
    },
    {
      id: "card",
      name: "بطاقة ائتمان/خصم",
      nameEn: "Credit/Debit Card",
      icon: "💳",
      enabled: !!process.env.STRIPE_SECRET_KEY || !!process.env.PAYMOB_API_KEY,
      fee: 0,
      providers: [],
    },
    {
      id: "wallet",
      name: "المحفظة",
      nameEn: "Wallet",
      icon: "👛",
      enabled: true,
      fee: 0,
    },
  ];

  if (process.env.STRIPE_SECRET_KEY) {
    methods[1].providers.push("stripe");
  }

  if (process.env.PAYMOB_API_KEY) {
    methods[1].providers.push("paymob");
  }

  successResponse(res, 200, "طرق الدفع المتاحة", { methods });
});

// @desc    Get Payment History
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({
    customer: req.user._id,
    "payment.status": "paid",
  })
    .select("orderNumber payment pricing createdAt")
    .sort("-createdAt");

  const consultations = await Consultation.find({
    patient: req.user._id,
    "payment.status": "paid",
  })
    .select("consultationNumber payment createdAt")
    .sort("-createdAt");

  const payments = [
    ...orders.map((o) => ({
      type: "order",
      number: o.orderNumber,
      amount: o.pricing.total,
      method: o.payment.method,
      date: o.payment.paidAt || o.createdAt,
      transactionId: o.payment.transactionId,
    })),
    ...consultations.map((c) => ({
      type: "consultation",
      number: c.consultationNumber,
      amount: c.payment.amount,
      method: c.payment.method,
      date: c.payment.paidAt || c.createdAt,
      transactionId: c.payment.transactionId,
    })),
  ].sort((a, b) => b.date - a.date);

  successResponse(res, 200, "سجل المدفوعات", {
    payments,
    count: payments.length,
  });
});

module.exports = {
  processCashPayment,
  createStripePaymentIntent,
  confirmStripePayment,
  createPaymobToken,
  paymobCallback,
  payWithWallet,
  getPaymentMethods,
  getPaymentHistory,
};
