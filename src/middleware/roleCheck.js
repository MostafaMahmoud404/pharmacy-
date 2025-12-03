const Doctor = require("../models/Doctor");

// التحقق من أن المستخدم له أحد الأدوار المحددة
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `غير مصرح لك بالوصول لهذا المورد. يتطلب دور: ${roles.join(
          " أو "
        )}`,
      });
    }

    next();
  };
};

// التحقق من أن المستخدم هو Admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "يتطلب صلاحيات المدير للوصول",
    });
  }
  next();
};

// التحقق من أن المستخدم هو دكتور
const isDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== "doctor") {
    return res.status(403).json({
      success: false,
      message: "يتطلب حساب دكتور للوصول",
    });
  }
  next();
};

// التحقق من أن المستخدم دكتور ومفعل
const isVerifiedDoctor = async (req, res, next) => {
  if (!req.user || req.user.role !== "doctor") {
    return res.status(403).json({
      success: false,
      message: "يتطلب حساب دكتور للوصول",
    });
  }

  try {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "ملف الدكتور غير موجود",
      });
    }

    if (!doctor.isVerified) {
      return res.status(403).json({
        success: false,
        message: "حسابك لم يتم التحقق منه بعد. يرجى انتظار موافقة الإدارة",
        requiresVerification: true,
      });
    }

    if (!doctor.isAvailable) {
      return res.status(403).json({
        success: false,
        message: "حسابك غير نشط حالياً",
      });
    }

    req.doctorProfile = doctor;
    next();
  } catch (error) {
    console.error("Verified Doctor Check Error:", error);
    return res.status(500).json({
      success: false,
      message: "خطأ في التحقق من حالة الدكتور",
    });
  }
};

// التحقق من أن المستخدم هو صيدلي
const isPharmacist = (req, res, next) => {
  if (!req.user || req.user.role !== "pharmacist") {
    return res.status(403).json({
      success: false,
      message: "يتطلب حساب صيدلي للوصول",
    });
  }
  next();
};

// التحقق من أن المستخدم هو عميل
const isCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "يتطلب حساب عميل للوصول",
    });
  }
  next();
};

// التحقق من أن المستخدم له صلاحية Admin أو هو صاحب المورد
const isAdminOrOwner = (ownerField = "user") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    // Admin له صلاحية الوصول لكل شيء
    if (req.user.role === "admin") {
      return next();
    }

    // التحقق من الملكية
    if (req.resource) {
      const ownerId = req.resource[ownerField]?.toString();
      if (ownerId === req.user._id.toString()) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول لهذا المورد",
    });
  };
};

// التحقق من أن المستخدم هو الدكتور أو المريض في الاستشارة
const isConsultationParticipant = async (req, res, next) => {
  try {
    const Consultation = require("../models/Consultation");
    const consultationId = req.params.consultationId || req.params.id;

    const consultation = await Consultation.findById(consultationId).populate(
      "doctor",
      "user"
    );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "الاستشارة غير موجودة",
      });
    }

    const isDoctorInConsultation =
      consultation.doctor.user.toString() === req.user._id.toString();
    const isPatientInConsultation =
      consultation.patient.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isDoctorInConsultation && !isPatientInConsultation && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بالوصول لهذه الاستشارة",
      });
    }

    req.consultation = consultation;
    req.isDoctor = isDoctorInConsultation;
    req.isPatient = isPatientInConsultation;

    next();
  } catch (error) {
    console.error("Consultation Participant Check Error:", error);
    return res.status(500).json({
      success: false,
      message: "خطأ في التحقق من صلاحيات الاستشارة",
    });
  }
};

// التحقق من أن المستخدم له حق الوصول للطلب
const canAccessOrder = async (req, res, next) => {
  try {
    const Order = require("../models/Order");
    const orderId = req.params.orderId || req.params.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود",
      });
    }

    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isPharmacist = req.user.role === "pharmacist";
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isPharmacist && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بالوصول لهذا الطلب",
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error("Order Access Check Error:", error);
    return res.status(500).json({
      success: false,
      message: "خطأ في التحقق من صلاحيات الطلب",
    });
  }
};

// التحقق من صلاحيات متعددة (OR logic)
const anyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `يتطلب أحد الأدوار التالية: ${roles.join(", ")}`,
    });
  };
};

// التحقق من صلاحيات متعددة (AND logic)
const allRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    // في هذه الحالة، نتحقق من أن المستخدم له خصائص معينة
    // مثال: admin + doctor في نفس الوقت (نادر الاستخدام)
    const hasAllRoles = roles.every(
      (role) => req.user.role === role || req.user.roles?.includes(role)
    );

    if (!hasAllRoles) {
      return res.status(403).json({
        success: false,
        message: `يتطلب جميع الأدوار التالية: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Permission-based authorization (للتوسع المستقبلي)
const hasPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    // Admin له كل الصلاحيات
    if (req.user.role === "admin") {
      return next();
    }

    // يمكن إضافة نظام permissions معقد هنا لاحقاً
    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = permissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasRequiredPermissions) {
      return res.status(403).json({
        success: false,
        message: "ليس لديك الصلاحيات الكافية",
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  isAdmin,
  isDoctor,
  isVerifiedDoctor,
  isPharmacist,
  isCustomer,
  isAdminOrOwner,
  isConsultationParticipant,
  canAccessOrder,
  anyRole,
  allRoles,
  hasPermission,
};
