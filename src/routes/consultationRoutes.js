const express = require("express");
const router = express.Router();

// استيراد الـ Controllers
const {
  bookConsultation,
  getConsultationById,
  getMyConsultations,
  getDoctorConsultations,
  confirmPayment,
  startConsultation,
  completeConsultation,
  cancelConsultation,
  addMessage,
  getMessages,
  rateConsultation,
  getUpcomingConsultations,
  getConsultationStats,
} = require("../controllers/consultationController");

// استيراد الـ Validation Rules
const {
  validateConsultation,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

// استيراد الـ Middleware للحماية والصلاحيات
const { protect } = require("../middleware/auth");

// Middleware للتحقق من الصلاحيات (Roles)
// ملاحظة: يجب أن يكون هذا الـ middleware موجود في ملف auth.js
// إذا لم يكن موجوداً، يمكنك استخدام هذا التعريف المؤقت:
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول أولاً",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بالوصول لهذا المورد",
      });
    }
    next();
  };
};

// ====================================
// Routes العامة (تحتاج تسجيل دخول فقط)
// ====================================

// الحصول على الاستشارات القادمة (للمريض أو الطبيب)
router.get("/upcoming", protect, validatePagination, getUpcomingConsultations);

// ====================================
// Routes الخاصة بالمرضى (Customers)
// ====================================

// حجز استشارة جديدة
router.post(
  "/",
  protect,
  authorize("customer"),
  validateConsultation,
  bookConsultation
);

// الحصول على استشارات المريض
router.get(
  "/my",
  protect,
  authorize("customer"),
  validatePagination,
  getMyConsultations
);

// ====================================
// Routes الخاصة بالأطباء (Doctors)
// ====================================

// الحصول على استشارات الطبيب
router.get(
  "/doctor/my",
  protect,
  authorize("doctor"),
  validatePagination,
  getDoctorConsultations
);

// ====================================
// Routes الخاصة بالمسؤولين (Admins)
// ====================================

// الحصول على إحصائيات الاستشارات
router.get("/stats", protect, authorize("admin"), getConsultationStats);

// ====================================
// Routes خاصة باستشارة محددة
// ====================================

// الحصول على تفاصيل استشارة محددة (متاحة للطبيب والمريض والمسؤول)
router.get("/:id", protect, validateObjectId("id"), getConsultationById);

// تأكيد الدفع (للمريض فقط)
router.post(
  "/:id/confirm-payment",
  protect,
  authorize("customer"),
  validateObjectId("id"),
  confirmPayment
);

// بدء الاستشارة (للطبيب فقط)
router.post(
  "/:id/start",
  protect,
  authorize("doctor"),
  validateObjectId("id"),
  startConsultation
);

// إنهاء الاستشارة (للطبيب فقط)
router.post(
  "/:id/complete",
  protect,
  authorize("doctor"),
  validateObjectId("id"),
  completeConsultation
);

// إلغاء الاستشارة (للطبيب والمريض)
router.post(
  "/:id/cancel",
  protect,
  validateObjectId("id"),
  cancelConsultation
);

// تقييم الاستشارة (للمريض فقط)
router.post(
  "/:id/rate",
  protect,
  authorize("customer"),
  validateObjectId("id"),
  rateConsultation
);

// ====================================
// Routes الخاصة بالرسائل (Chat)
// ====================================

// إضافة رسالة في الشات (للطبيب والمريض)
router.post("/:id/messages", protect, validateObjectId("id"), addMessage);

// الحصول على رسائل الشات (للطبيب والمريض)
router.get("/:id/messages", protect, validateObjectId("id"), getMessages);

module.exports = router;