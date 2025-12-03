const Order = require("../models/Order");
const Product = require("../models/Product");
const Prescription = require("../models/Prescription");
const Delivery = require("../models/Delivery");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");

// @desc    Create order
// @route   POST /api/orders
// @access  Private/Customer
const createOrder = asyncHandler(async (req, res, next) => {
  const {
    items,
    prescriptionId,
    consultationId,
    deliveryAddress,
    paymentMethod,
    customerNotes,
  } = req.body;

  if (!items || items.length === 0) {
    return next(new ErrorResponse("يجب إضافة منتج واحد على الأقل", 400));
  }

  // معالجة المنتجات وحساب الأسعار
  const processedItems = await Promise.all(
    items.map(async (item) => {
      const product = await Product.findById(item.product);

      if (!product) {
        throw new ErrorResponse(`المنتج ${item.product} غير موجود`, 404);
      }

      if (!product.isActive) {
        throw new ErrorResponse(`المنتج ${product.name} غير متاح`, 400);
      }

      if (product.stock < item.quantity) {
        throw new ErrorResponse(
          `الكمية المطلوبة من ${product.name} غير متوفرة. المتاح: ${product.stock}`,
          400
        );
      }

      // التحقق من الروشتة إذا كان المنتج يتطلبها
      if (product.requiresPrescription && !prescriptionId) {
        throw new ErrorResponse(`المنتج ${product.name} يتطلب روشتة طبية`, 400);
      }

      const price = product.discountPrice || product.price;
      const subtotal = price * item.quantity;

      return {
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
        subtotal,
        requiresPrescription: product.requiresPrescription,
      };
    })
  );

  // حساب الأسعار
  const subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = subtotal >= 200 ? 0 : 30; // توصيل مجاني فوق 200 جنيه
  const tax = subtotal * 0.14; // ضريبة 14%
  const total = subtotal + deliveryFee + tax;

  // التحقق من الروشتة إذا كانت موجودة
  if (prescriptionId) {
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return next(new ErrorResponse("الروشتة غير موجودة", 404));
    }
    if (prescription.patient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("هذه الروشتة لا تخصك", 403));
    }
    if (!prescription.isValid) {
      return next(new ErrorResponse("الروشتة غير صالحة أو منتهية", 400));
    }
  }

  // إنشاء الطلب
  const order = await Order.create({
    customer: req.user._id,
    prescription: prescriptionId,
    consultation: consultationId,
    items: processedItems,
    pricing: {
      subtotal,
      deliveryFee,
      tax,
      total,
    },
    deliveryAddress,
    payment: {
      method: paymentMethod,
      status: paymentMethod === "cash" ? "pending" : "pending",
    },
    customerNotes,
    metadata: {
      source: "web",
    },
  });

  // تقليل المخزون
  await Promise.all(
    processedItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, salesCount: item.quantity },
      })
    )
  );

  // تحديث حالة الروشتة
  if (prescriptionId) {
    await Prescription.findByIdAndUpdate(prescriptionId, {
      order: order._id,
      status: "fulfilled",
    });
  }

  // إنشاء سجل التوصيل
  await Delivery.create({
    order: order._id,
    deliveryAddress: deliveryAddress,
    estimatedDeliveryTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // يومان
    deliveryFee: {
      base: deliveryFee,
      total: deliveryFee,
    },
  });

  await order.populate([
    { path: "items.product", select: "name nameArabic images" },
  ]);

  successResponse(res, 201, "تم إنشاء الطلب بنجاح", { order });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate([
    { path: "customer", select: "name phone email" },
    { path: "items.product", select: "name nameArabic images price" },
    { path: "prescription" },
  ]);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  // التحقق من الصلاحيات
  const isCustomer = order.customer._id.toString() === req.user._id.toString();
  const isPharmacist = req.user.role === "pharmacist";
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isPharmacist && !isAdmin) {
    return next(new ErrorResponse("غير مصرح لك بالوصول لهذا الطلب", 403));
  }

  // الحصول على معلومات التوصيل
  const delivery = await Delivery.findOne({ order: order._id }).populate(
    "deliveryPerson",
    "name phone"
  );

  successResponse(res, 200, "تم الحصول على الطلب بنجاح", {
    order,
    delivery,
  });
});

// @desc    Get my orders (Customer)
// @route   GET /api/orders/my
// @access  Private/Customer
const getMyOrders = asyncHandler(async (req, res, next) => {
  const { status } = req.query;

  let query = { customer: req.user._id };
  if (status) {
    query.status = status;
  }

  const features = new APIFeatures(
    Order.find(query).populate("items.product", "name nameArabic images"),
    req.query
  )
    .sort()
    .paginate();

  const orders = await features.query;
  const total = await Order.countDocuments(query);

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الطلبات بنجاح",
    { orders },
    pagination
  );
});

// @desc    Get all orders (Pharmacist/Admin)
// @route   GET /api/orders
// @access  Private/Pharmacist/Admin
const getAllOrders = asyncHandler(async (req, res, next) => {
  const { status, startDate, endDate } = req.query;

  let query = {};

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const features = new APIFeatures(
    Order.find(query)
      .populate("customer", "name phone")
      .populate("items.product", "name nameArabic"),
    req.query
  )
    .sort()
    .paginate();

  const orders = await features.query;
  const total = await Order.countDocuments(query);

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الطلبات بنجاح",
    { orders },
    pagination
  );
});

// @desc    Confirm payment
// @route   POST /api/orders/:id/confirm-payment
// @access  Private/Customer
const confirmPayment = asyncHandler(async (req, res, next) => {
  const { transactionId } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
  }

  if (order.payment.status === "paid") {
    return next(new ErrorResponse("تم الدفع بالفعل", 400));
  }

  order.payment.status = "paid";
  order.payment.transactionId = transactionId;
  order.payment.paidAt = new Date();
  order.status = "confirmed";

  await order.save();

  successResponse(res, 200, "تم تأكيد الدفع بنجاح", { order });
});

// @desc    Update order status (Pharmacist/Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Pharmacist/Admin
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  await order.updateStatus(status, req.user._id, note);

  // تحديث التوصيل
  if (status === "out-for-delivery") {
    await Delivery.findOneAndUpdate(
      { order: order._id },
      { status: "in-transit" }
    );
  } else if (status === "delivered") {
    await Delivery.findOneAndUpdate(
      { order: order._id },
      {
        status: "delivered",
        actualDeliveryTime: new Date(),
      }
    );
  }

  successResponse(res, 200, "تم تحديث حالة الطلب بنجاح", { order });
});

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  // التحقق من الصلاحيات
  const isCustomer = order.customer.toString() === req.user._id.toString();
  const isPharmacist = req.user.role === "pharmacist";
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isPharmacist && !isAdmin) {
    return next(new ErrorResponse("غير مصرح لك بإلغاء هذا الطلب", 403));
  }

  const cancelledBy = isCustomer ? "customer" : "pharmacy";
  await order.cancel(cancelledBy, reason);

  successResponse(res, 200, "تم إلغاء الطلب بنجاح", { order });
});

// @desc    Assign delivery person
// @route   PUT /api/orders/:id/assign-delivery
// @access  Private/Pharmacist/Admin
const assignDeliveryPerson = asyncHandler(async (req, res, next) => {
  const { deliveryPersonId } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  order.delivery.assignedTo = deliveryPersonId;
  await order.save();

  // تحديث سجل التوصيل
  const delivery = await Delivery.findOne({ order: order._id });
  if (delivery) {
    await delivery.assignDriver(deliveryPersonId);
  }

  successResponse(res, 200, "تم تعيين مندوب التوصيل بنجاح", { order });
});

// @desc    Verify prescription for order (Pharmacist)
// @route   POST /api/orders/:id/verify-prescription
// @access  Private/Pharmacist
const verifyPrescription = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  if (!order.prescription) {
    return next(new ErrorResponse("هذا الطلب لا يحتوي على روشتة", 400));
  }

  order.prescriptionVerification = {
    isVerified: true,
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
    verificationNotes: notes,
  };

  await order.save();

  successResponse(res, 200, "تم التحقق من الروشتة بنجاح", { order });
});

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/stats
// @access  Private/Admin
const getOrderStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const query = startDate || endDate ? { createdAt: dateFilter } : {};

  // إحصائيات عامة
  const totalOrders = await Order.countDocuments(query);
  const pendingOrders = await Order.countDocuments({
    ...query,
    status: "pending",
  });
  const confirmedOrders = await Order.countDocuments({
    ...query,
    status: "confirmed",
  });
  const deliveredOrders = await Order.countDocuments({
    ...query,
    status: "delivered",
  });
  const cancelledOrders = await Order.countDocuments({
    ...query,
    status: "cancelled",
  });

  // إحصائيات الإيرادات
  const revenueStats = await Order.aggregate([
    { $match: { ...query, "payment.status": "paid" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$pricing.total" },
        avgOrderValue: { $avg: "$pricing.total" },
      },
    },
  ]);

  // التوزيع حسب طريقة الدفع
  const paymentMethodDistribution = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$payment.method",
        count: { $sum: 1 },
      },
    },
  ]);

  // أكثر المنتجات طلباً
  const topProducts = await Order.aggregate([
    { $match: query },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.subtotal" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.name",
        nameArabic: "$product.nameArabic",
        totalQuantity: 1,
        totalRevenue: 1,
      },
    },
  ]);

  const stats = {
    total: totalOrders,
    pending: pendingOrders,
    confirmed: confirmedOrders,
    delivered: deliveredOrders,
    cancelled: cancelledOrders,
    revenue: {
      total: revenueStats[0]?.totalRevenue || 0,
      average: revenueStats[0]?.avgOrderValue || 0,
    },
    paymentMethodDistribution,
    topProducts,
  };

  successResponse(res, 200, "تم الحصول على الإحصائيات بنجاح", { stats });
});

// @desc    Rate order
// @route   POST /api/orders/:id/rate
// @access  Private/Customer
const rateOrder = asyncHandler(async (req, res, next) => {
  const { score, comment } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("غير مصرح لك بتقييم هذا الطلب", 403));
  }

  if (order.status !== "delivered") {
    return next(new ErrorResponse("يجب استلام الطلب قبل التقييم", 400));
  }

  if (order.rating?.score) {
    return next(new ErrorResponse("تم تقييم الطلب بالفعل", 400));
  }

  order.rating = {
    score,
    comment,
    ratedAt: new Date(),
  };

  await order.save();

  successResponse(res, 200, "تم تقييم الطلب بنجاح", { order });
});

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  confirmPayment,
  updateOrderStatus,
  cancelOrder,
  assignDeliveryPerson,
  verifyPrescription,
  getOrderStats,
  rateOrder,
};
