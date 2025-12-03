const { body, param, query, validationResult } = require("express-validator");

// معالجة أخطاء الـ Validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: "خطأ في البيانات المدخلة",
      errors: formattedErrors,
    });
  }

  next();
};

// Validation Rules for User Registration
const validateRegistration = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("الاسم مطلوب")
    .isLength({ min: 3 })
    .withMessage("الاسم يجب أن يكون 3 أحرف على الأقل")
    .isLength({ max: 50 })
    .withMessage("الاسم يجب ألا يتجاوز 50 حرف"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("البريد الإلكتروني مطلوب")
    .isEmail()
    .withMessage("البريد الإلكتروني غير صحيح")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("كلمة المرور مطلوبة")
    .isLength({ min: 6 })
    .withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("رقم الهاتف مطلوب")
    .matches(/^01[0-2,5]{1}[0-9]{8}$/)
    .withMessage("رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01)"),

  body("role")
    .optional()
    .isIn(["customer", "doctor", "pharmacist"])
    .withMessage("الدور غير صحيح"),

  handleValidationErrors,
];

// Validation Rules for Login
const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("البريد الإلكتروني مطلوب")
    .isEmail()
    .withMessage("البريد الإلكتروني غير صحيح")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("كلمة المرور مطلوبة"),

  handleValidationErrors,
];

// Validation Rules for Doctor Profile
const validateDoctorProfile = [
  body("specialty")
    .notEmpty()
    .withMessage("التخصص مطلوب")
    .isIn([
      "general",
      "pediatrics",
      "cardiology",
      "dermatology",
      "orthopedics",
      "neurology",
      "psychiatry",
      "gynecology",
      "ophthalmology",
      "ent",
      "dentistry",
      "other",
    ])
    .withMessage("التخصص غير صحيح"),

  body("specialtyArabic").notEmpty().withMessage("التخصص بالعربية مطلوب"),

  body("licenseNumber")
    .notEmpty()
    .withMessage("رقم الترخيص مطلوب")
    .isLength({ min: 5 })
    .withMessage("رقم الترخيص غير صحيح"),

  body("experience")
    .notEmpty()
    .withMessage("سنوات الخبرة مطلوبة")
    .isInt({ min: 0, max: 50 })
    .withMessage("سنوات الخبرة يجب أن تكون رقم بين 0 و 50"),

  body("consultationFee")
    .notEmpty()
    .withMessage("رسوم الاستشارة مطلوبة")
    .isFloat({ min: 0 })
    .withMessage("رسوم الاستشارة يجب أن تكون رقم موجب"),

  body("bio")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("النبذة يجب ألا تتجاوز 1000 حرف"),

  handleValidationErrors,
];

// Validation Rules for Product
const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("اسم المنتج مطلوب")
    .isLength({ min: 3, max: 200 })
    .withMessage("اسم المنتج يجب أن يكون بين 3 و 200 حرف"),

  body("nameArabic").trim().notEmpty().withMessage("الاسم العربي مطلوب"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("الوصف مطلوب")
    .isLength({ max: 2000 })
    .withMessage("الوصف يجب ألا يتجاوز 2000 حرف"),

  body("price")
    .notEmpty()
    .withMessage("السعر مطلوب")
    .isFloat({ min: 0 })
    .withMessage("السعر يجب أن يكون رقم موجب"),

  body("stock")
    .notEmpty()
    .withMessage("الكمية مطلوبة")
    .isInt({ min: 0 })
    .withMessage("الكمية يجب أن تكون رقم صحيح موجب"),

  body("category")
    .notEmpty()
    .withMessage("التصنيف مطلوب")
    .isIn([
      "pain-relief",
      "antibiotics",
      "vitamins",
      "diabetes",
      "heart",
      "respiratory",
      "digestive",
      "skin-care",
      "supplements",
      "baby-care",
      "personal-care",
      "other",
    ])
    .withMessage("التصنيف غير صحيح"),

  body("requiresPrescription")
    .optional()
    .isBoolean()
    .withMessage("requiresPrescription يجب أن يكون true أو false"),

  body("sku")
    .notEmpty()
    .withMessage("SKU مطلوب")
    .isLength({ min: 3, max: 50 })
    .withMessage("SKU يجب أن يكون بين 3 و 50 حرف"),

  handleValidationErrors,
];

// Validation Rules for Prescription
const validatePrescription = [
  body("diagnosis")
    .trim()
    .notEmpty()
    .withMessage("التشخيص مطلوب")
    .isLength({ max: 500 })
    .withMessage("التشخيص يجب ألا يتجاوز 500 حرف"),

  body("medications")
    .isArray({ min: 1 })
    .withMessage("يجب إضافة دواء واحد على الأقل"),

  body("medications.*.dosage").notEmpty().withMessage("الجرعة مطلوبة"),

  body("medications.*.frequency")
    .notEmpty()
    .withMessage("عدد مرات تناول الدواء مطلوب"),

  body("medications.*.duration").notEmpty().withMessage("مدة العلاج مطلوبة"),

  body("medications.*.quantity")
    .isInt({ min: 1 })
    .withMessage("الكمية يجب أن تكون رقم موجب"),

  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("الملاحظات يجب ألا تتجاوز 1000 حرف"),

  handleValidationErrors,
];

// Validation Rules for Consultation (معدل)
const validateConsultation = [
  body("doctorId")
    .notEmpty()
    .withMessage("معرف الدكتور مطلوب")
    .isMongoId()
    .withMessage("معرف الدكتور غير صحيح"),

  body("type")
    .notEmpty()
    .withMessage("نوع الاستشارة مطلوب")
    .isIn(["chat", "video", "audio"])
    .withMessage("نوع الاستشارة يجب أن يكون: chat, video, أو audio"),

  body("scheduledTime")
    .notEmpty()
    .withMessage("وقت الاستشارة مطلوب")
    .isISO8601()
    .withMessage("صيغة التاريخ غير صحيحة")
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error("وقت الاستشارة يجب أن يكون في المستقبل");
      }
      return true;
    }),

  body("chiefComplaint")
    .trim()
    .notEmpty()
    .withMessage("السبب الرئيسي للاستشارة مطلوب")
    .isLength({ min: 5, max: 500 })
    .withMessage("السبب الرئيسي يجب أن يكون بين 5 و 500 حرف"),

  body("symptoms")
    .optional()
    .isArray()
    .withMessage("الأعراض يجب أن تكون مصفوفة"),

  body("medicalHistory")
    .optional()
    .isObject()
    .withMessage("التاريخ الطبي يجب أن يكون كائن"),

  handleValidationErrors,
];

// Validation Rules for Message (جديد)
const validateMessage = [
  param("id").isMongoId().withMessage("معرف الاستشارة غير صحيح"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("الرسالة مطلوبة")
    .isLength({ min: 1, max: 1000 })
    .withMessage("الرسالة يجب أن تكون بين 1 و 1000 حرف"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("المرفقات يجب أن تكون مصفوفة"),

  handleValidationErrors,
];

// Validation Rules for Rating Consultation (جديد)
const validateRating = [
  param("id").isMongoId().withMessage("معرف الاستشارة غير صحيح"),

  body("score")
    .notEmpty()
    .withMessage("التقييم مطلوب")
    .isInt({ min: 1, max: 5 })
    .withMessage("التقييم يجب أن يكون بين 1 و 5"),

  body("comment")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("التعليق يجب ألا يتجاوز 500 حرف"),

  handleValidationErrors,
];

// Validation Rules for Payment Confirmation (جديد)
const validatePayment = [
  param("id").isMongoId().withMessage("معرف الاستشارة غير صحيح"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("طريقة الدفع مطلوبة")
    .isIn(["cash", "card", "wallet", "insurance"])
    .withMessage("طريقة الدفع غير صحيحة"),

  body("transactionId")
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("رقم المعاملة غير صحيح"),

  handleValidationErrors,
];

// Validation Rules for Cancellation (جديد)
const validateCancellation = [
  param("id").isMongoId().withMessage("معرف الاستشارة غير صحيح"),

  body("reason")
    .trim()
    .notEmpty()
    .withMessage("سبب الإلغاء مطلوب")
    .isLength({ min: 10, max: 500 })
    .withMessage("سبب الإلغاء يجب أن يكون بين 10 و 500 حرف"),

  handleValidationErrors,
];

// Validation Rules for Completion (جديد)
const validateCompletion = [
  param("id").isMongoId().withMessage("معرف الاستشارة غير صحيح"),

  body("doctorNotes")
    .trim()
    .notEmpty()
    .withMessage("ملاحظات الطبيب مطلوبة")
    .isLength({ min: 10, max: 2000 })
    .withMessage("ملاحظات الطبيب يجب أن تكون بين 10 و 2000 حرف"),

  body("diagnosis")
    .trim()
    .notEmpty()
    .withMessage("التشخيص مطلوب")
    .isLength({ min: 5, max: 500 })
    .withMessage("التشخيص يجب أن يكون بين 5 و 500 حرف"),

  handleValidationErrors,
];

// Validation Rules for Order
const validateOrder = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("يجب إضافة منتج واحد على الأقل"),

  body("items.*.product")
    .notEmpty()
    .withMessage("معرف المنتج مطلوب")
    .isMongoId()
    .withMessage("معرف المنتج غير صحيح"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("الكمية يجب أن تكون رقم موجب"),

  body("deliveryAddress").notEmpty().withMessage("عنوان التوصيل مطلوب"),

  body("deliveryAddress.street").trim().notEmpty().withMessage("الشارع مطلوب"),

  body("deliveryAddress.city").trim().notEmpty().withMessage("المدينة مطلوبة"),

  body("deliveryAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("رقم الهاتف مطلوب")
    .matches(/^01[0-2,5]{1}[0-9]{8}$/)
    .withMessage("رقم الهاتف غير صحيح"),

  body("paymentmethod")
    .notEmpty()
    .withMessage("طريقة الدفع مطلوبة")
    .isIn(["cash", "card", "wallet", "insurance"])
    .withMessage("طريقة الدفع غير صحيحة"),

  handleValidationErrors,
];

// Validation Rules for Review
const validateReview = [
  body("rating")
    .notEmpty()
    .withMessage("التقييم مطلوب")
    .isInt({ min: 1, max: 5 })
    .withMessage("التقييم يجب أن يكون بين 1 و 5"),

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("التعليق مطلوب")
    .isLength({ min: 10, max: 1000 })
    .withMessage("التعليق يجب أن يكون بين 10 و 1000 حرف"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("العنوان يجب ألا يتجاوز 100 حرف"),

  handleValidationErrors,
];

// Validation for MongoDB ObjectId
const validateObjectId = (paramName = "id") => [
  param(paramName).isMongoId().withMessage(`${paramName} غير صحيح`),
  handleValidationErrors,
];

// Validation for Pagination
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("رقم الصفحة يجب أن يكون رقم موجب"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("عدد العناصر يجب أن يكون بين 1 و 100"),

  query("sort").optional().isString().withMessage("الترتيب يجب أن يكون نص"),

  handleValidationErrors,
];

// Validation for Email
const validateEmail = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("البريد الإلكتروني مطلوب")
    .isEmail()
    .withMessage("البريد الإلكتروني غير صحيح")
    .normalizeEmail(),
  handleValidationErrors,
];

// Validation for Password Reset
const validatePasswordReset = [
  body("password")
    .notEmpty()
    .withMessage("كلمة المرور مطلوبة")
    .isLength({ min: 6 })
    .withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("تأكيد كلمة المرور مطلوب")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("كلمات المرور غير متطابقة");
      }
      return true;
    }),

  handleValidationErrors,
];

// Validation for Update Password
const validateUpdatePassword = [
  body("currentPassword").notEmpty().withMessage("كلمة المرور الحالية مطلوبة"),

  body("newPassword")
    .notEmpty()
    .withMessage("كلمة المرور الجديدة مطلوبة")
    .isLength({ min: 6 })
    .withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة");
      }
      return true;
    }),

  handleValidationErrors,
];

// Custom validation for file uploads
const validateFileUpload = (allowedTypes, maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      // التحقق من نوع الملف
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `نوع الملف غير مسموح. الأنواع المسموحة: ${allowedTypes.join(
            ", "
          )}`,
        });
      }

      // التحقق من حجم الملف
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        return res.status(400).json({
          success: false,
          message: `حجم الملف يتجاوز الحد المسموح (${maxSizeMB}MB)`,
        });
      }
    }

    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateDoctorProfile,
  validateProduct,
  validatePrescription,
  validateConsultation,
  validateMessage,
  validateRating,
  validatePayment,
  validateCancellation,
  validateCompletion,
  validateOrder,
  validateReview,
  validateObjectId,
  validatePagination,
  validateEmail,
  validatePasswordReset,
  validateUpdatePassword,
  validateFileUpload,
};