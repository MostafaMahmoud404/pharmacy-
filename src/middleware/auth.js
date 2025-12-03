const jwt = require("jsonwebtoken");
const User = require("../models/User");

// التحقق من وجود Token صحيح
const protect = async (req, res, next) => {
  let token;

  // استخراج الـ Token من الـ Header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // التحقق من وجود Token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "غير مصرح بالوصول، الرجاء تسجيل الدخول",
    });
  }

  try {
    // التحقق من صحة الـ Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // الحصول على بيانات المستخدم
    req.user = await User.findById(decoded.id).select("-password").lean();

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    // التحقق من أن الحساب نشط
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "الحساب معطل، يرجى التواصل مع الإدارة",
      });
    }

    // تحديث آخر تسجيل دخول
    await User.findByIdAndUpdate(req.user._id, { lastLogin: new Date() });

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token غير صحيح",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى",
      });
    }

    return res.status(401).json({
      success: false,
      message: "غير مصرح بالوصول",
    });
  }
};

// Middleware اختياري - يسمح بالوصول مع أو بدون Token
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password").lean();
    } catch (error) {
      // في حالة الـ optional auth، نتجاهل الأخطاء
      req.user = null;
    }
  }

  next();
};

// التحقق من تفعيل البريد الإلكتروني
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: "يرجى تفعيل البريد الإلكتروني أولاً",
      requiresVerification: true,
    });
  }
  next();
};

// التحقق من أن المستخدم هو صاحب المورد
const checkOwnership = (model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const Model = require(`../models/${model}`);
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "المورد غير موجود",
        });
      }

      // التحقق من الملكية
      const ownerId = resource.user
        ? resource.user.toString()
        : resource.customer
        ? resource.customer.toString()
        : resource.patient
        ? resource.patient.toString()
        : null;

      if (ownerId !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بالوصول لهذا المورد",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error("Ownership Check Error:", error);
      return res.status(500).json({
        success: false,
        message: "خطأ في التحقق من الصلاحيات",
      });
    }
  };
};

// Rate Limiting بسيط (يمكن استخدام express-rate-limit في الإنتاج)
const loginAttempts = new Map();

const loginRateLimit = (req, res, next) => {
  const identifier = req.body.email || req.ip;
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || {
    count: 0,
    resetTime: now,
  };

  // إعادة تعيين العداد بعد 15 دقيقة
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + 15 * 60 * 1000;
  }

  attempts.count += 1;
  loginAttempts.set(identifier, attempts);

  // السماح بـ 5 محاولات فقط كل 15 دقيقة
  if (attempts.count > 5) {
    const remainingTime = Math.ceil((attempts.resetTime - now) / 60000);
    return res.status(429).json({
      success: false,
      message: `تم تجاوز عدد المحاولات المسموحة. حاول مرة أخرى بعد ${remainingTime} دقيقة`,
    });
  }

  next();
};

// تنظيف محاولات تسجيل الدخول القديمة كل ساعة
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now > value.resetTime) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  protect,
  optionalAuth,
  requireEmailVerification,
  checkOwnership,
  loginRateLimit,
};
