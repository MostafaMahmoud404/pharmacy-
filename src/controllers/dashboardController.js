const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Consultation = require("../models/Consultation");
const Prescription = require("../models/Prescription");
const { asyncHandler, successResponse } = require("../middleware/errorHandler");
const { startOfDay, endOfDay, addDays } = require("../utils/helpers");
const Review = require("../models/Review");


// @desc    Get Admin Dashboard Statistics
// @route   GET /api/dashboard/admin
// @access  Private/Admin
const getAdminDashboard = asyncHandler(async (req, res, next) => {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const last30Days = addDays(today, -30);

  // إحصائيات عامة
  const totalUsers = await User.countDocuments();
  const totalDoctors = await Doctor.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalConsultations = await Consultation.countDocuments();

  // إحصائيات اليوم
  const todayOrders = await Order.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  });
  const todayConsultations = await Consultation.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  });
  const todayRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.total" },
      },
    },
  ]);

  // إحصائيات آخر 30 يوم
  const last30DaysOrders = await Order.countDocuments({
    createdAt: { $gte: last30Days },
  });
  const last30DaysRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: last30Days },
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.total" },
      },
    },
  ]);

  // الطلبات حسب الحالة
  const ordersByStatus = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // الاستشارات حسب الحالة
  const consultationsByStatus = await Consultation.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // أفضل 5 منتجات مبيعاً
  const topProducts = await Product.find({ isActive: true })
    .sort("-salesCount")
    .limit(5)
    .select("name nameArabic price salesCount images");

  // أفضل 5 أطباء تقييماً
  const topDoctors = await Doctor.find({ isVerified: true })
    .sort("-rating.average")
    .limit(5)
    .populate("user", "name profileImage")
    .select("specialty specialtyArabic rating totalConsultations");

  // الطلبات المعلقة
  const pendingOrders = await Order.countDocuments({ status: "pending" });
  const pendingConsultations = await Consultation.countDocuments({
    status: "pending",
  });

  // الأطباء في انتظار التفعيل
  const pendingDoctors = await Doctor.countDocuments({ isVerified: false });

  // المنتجات منخفضة المخزون
  const lowStockProducts = await Product.countDocuments({
    stock: { $lte: 10, $gt: 0 },
  });

  // المنتجات نفذت من المخزون
  const outOfStockProducts = await Product.countDocuments({ stock: 0 });

  // رسم بياني للإيرادات (آخر 7 أيام)
  const revenueChart = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: addDays(today, -7) },
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: { $sum: "$pricing.total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // رسم بياني للاستشارات (آخر 7 أيام)
  const consultationsChart = await Consultation.aggregate([
    {
      $match: {
        createdAt: { $gte: addDays(today, -7) },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const stats = {
    overview: {
      totalUsers,
      totalDoctors,
      totalProducts,
      totalOrders,
      totalConsultations,
    },
    today: {
      orders: todayOrders,
      consultations: todayConsultations,
      revenue: todayRevenue[0]?.total || 0,
    },
    last30Days: {
      orders: last30DaysOrders,
      revenue: last30DaysRevenue[0]?.total || 0,
    },
    pending: {
      orders: pendingOrders,
      consultations: pendingConsultations,
      doctors: pendingDoctors,
    },
    inventory: {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
    },
    ordersByStatus,
    consultationsByStatus,
    topProducts,
    topDoctors,
    charts: {
      revenue: revenueChart,
      consultations: consultationsChart,
    },
  };

  successResponse(res, 200, "إحصائيات لوحة التحكم", { stats });
});

// @desc    Get Doctor Dashboard Statistics
// @route   GET /api/dashboard/doctor
// @access  Private/Doctor
const getDoctorDashboard = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);

  // إحصائيات عامة
  const totalConsultations = doctor.totalConsultations;
  const completedConsultations = await Consultation.countDocuments({
    doctor: doctor._id,
    status: "completed",
  });

  // إحصائيات اليوم
  const todayConsultations = await Consultation.countDocuments({
    doctor: doctor._id,
    scheduledTime: { $gte: startOfToday, $lte: endOfToday },
  });

  // الاستشارات القادمة
  const upcomingConsultations = await Consultation.find({
    doctor: doctor._id,
    status: { $in: ["pending", "confirmed"] },
    scheduledTime: { $gte: new Date() },
  })
    .populate("patient", "name phone profileImage")
    .sort("scheduledTime")
    .limit(5);

  // الاستشارات الأخيرة
  const recentConsultations = await Consultation.find({
    doctor: doctor._id,
    status: "completed",
  })
    .populate("patient", "name profileImage")
    .sort("-createdAt")
    .limit(5)
    .select("consultationNumber scheduledTime chiefComplaint status");

  // آخر الروشتات
  const recentPrescriptions = await Prescription.find({
    doctor: doctor._id,
  })
    .populate("patient", "name")
    .sort("-createdAt")
    .limit(5)
    .select("prescriptionNumber diagnosis createdAt");

  // الإيرادات (تقريبية)
  const totalRevenue = await Consultation.aggregate([
    {
      $match: {
        doctor: doctor._id,
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$payment.amount" },
      },
    },
  ]);

  // التقييمات الأخيرة
  const recentReviews = await Review.find({
    doctor: doctor._id,
    status: "approved",
  })
    .populate("reviewer", "name profileImage")
    .sort("-createdAt")
    .limit(5)
    .select("rating comment createdAt");

  const stats = {
    overview: {
      totalConsultations,
      completedConsultations,
      rating: doctor.rating,
      totalRevenue: totalRevenue[0]?.total || 0,
    },
    today: {
      consultations: todayConsultations,
    },
    upcomingConsultations,
    recentConsultations,
    recentPrescriptions,
    recentReviews,
  };

  successResponse(res, 200, "إحصائيات لوحة التحكم", { stats });
});

// @desc    Get Pharmacist Dashboard Statistics
// @route   GET /api/dashboard/pharmacist
// @access  Private/Pharmacist
const getPharmacistDashboard = asyncHandler(async (req, res, next) => {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);

  // الطلبات الجديدة
  const newOrders = await Order.countDocuments({ status: "pending" });

  // الطلبات قيد التجهيز
  const processingOrders = await Order.countDocuments({
    status: { $in: ["confirmed", "preparing"] },
  });

  // الطلبات اليوم
  const todayOrders = await Order.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  });

  // إيرادات اليوم
  const todayRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.total" },
      },
    },
  ]);

  // الروشتات الجديدة
  const newPrescriptions = await Prescription.countDocuments({
    sentToPharmacy: true,
    status: "active",
  });

  // المنتجات منخفضة المخزون
  const lowStockProducts = await Product.find({
    stock: { $lte: 10, $gt: 0 },
  })
    .sort("stock")
    .limit(10)
    .select("name nameArabic stock lowStockThreshold sku");

  // المنتجات نفذت
  const outOfStockCount = await Product.countDocuments({ stock: 0 });

  // آخر الطلبات
  const recentOrders = await Order.find()
    .populate("customer", "name phone")
    .sort("-createdAt")
    .limit(10)
    .select("orderNumber status pricing.total createdAt");

  const stats = {
    orders: {
      new: newOrders,
      processing: processingOrders,
      today: todayOrders,
    },
    revenue: {
      today: todayRevenue[0]?.total || 0,
    },
    prescriptions: {
      new: newPrescriptions,
    },
    inventory: {
      lowStock: lowStockProducts.length,
      outOfStock: outOfStockCount,
    },
    lowStockProducts,
    recentOrders,
  };

  successResponse(res, 200, "إحصائيات لوحة التحكم", { stats });
});

// @desc    Get Customer Dashboard Statistics
// @route   GET /api/dashboard/customer
// @access  Private/Customer
const getCustomerDashboard = asyncHandler(async (req, res, next) => {
  // آخر الطلبات
  const recentOrders = await Order.find({ customer: req.user._id })
    .populate("items.product", "name nameArabic images")
    .sort("-createdAt")
    .limit(5)
    .select("orderNumber status pricing.total createdAt");

  // الطلبات النشطة
  const activeOrders = await Order.find({
    customer: req.user._id,
    status: { $in: ["pending", "confirmed", "preparing", "out-for-delivery"] },
  })
    .populate("items.product", "name nameArabic images")
    .sort("-createdAt");

  // الاستشارات القادمة
  const upcomingConsultations = await Consultation.find({
    patient: req.user._id,
    status: { $in: ["pending", "confirmed"] },
    scheduledTime: { $gte: new Date() },
  })
    .populate("doctor", "user specialty specialtyArabic")
    .populate({
      path: "doctor",
      populate: { path: "user", select: "name profileImage" },
    })
    .sort("scheduledTime")
    .limit(5);

  // آخر الروشتات
  const recentPrescriptions = await Prescription.find({
    patient: req.user._id,
  })
    .populate("doctor", "user specialty")
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort("-createdAt")
    .limit(5)
    .select("prescriptionNumber diagnosis createdAt");

  // إحصائيات عامة
  const totalOrders = await Order.countDocuments({ customer: req.user._id });
  const totalConsultations = await Consultation.countDocuments({
    patient: req.user._id,
  });
  const totalSpent = await Order.aggregate([
    {
      $match: {
        customer: req.user._id,
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$pricing.total" },
      },
    },
  ]);

  const stats = {
    overview: {
      totalOrders,
      totalConsultations,
      totalSpent: totalSpent[0]?.total || 0,
    },
    recentOrders,
    activeOrders,
    upcomingConsultations,
    recentPrescriptions,
  };

  successResponse(res, 200, "إحصائيات لوحة التحكم", { stats });
});

module.exports = {
  getAdminDashboard,
  getDoctorDashboard,
  getPharmacistDashboard,
  getCustomerDashboard,
};
