const User = require("../models/User");
const Doctor = require("../models/Doctor");
const { generateToken } = require("../config/jwt");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
} = require("../middleware/errorHandler");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, role } = req.body;

  // التحقق من وجود المستخدم
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return next(new ErrorResponse("البريد الإلكتروني مستخدم بالفعل", 400));
    }
    if (existingUser.phone === phone) {
      return next(new ErrorResponse("رقم الهاتف مستخدم بالفعل", 400));
    }
  }

  // إنشاء المستخدم
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || "customer",
  });

  // توليد Token للتفعيل
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعة
  await user.save({ validateBeforeSave: false });

  // إرسال إيميل التفعيل (اختياري في البداية)
  // await sendVerificationEmail(user.email, verificationToken);

  // إنشاء JWT Token
  const token = generateToken(user._id);

  successResponse(res, 201, "تم التسجيل بنجاح", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    token,
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // البحث عن المستخدم مع كلمة المرور
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(
      new ErrorResponse("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401)
    );
  }

  // التحقق من كلمة المرور
  const isPasswordMatch = await user.matchPassword(password);

  if (!isPasswordMatch) {
    return next(
      new ErrorResponse("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401)
    );
  }

  // التحقق من أن الحساب نشط
  if (!user.isActive) {
    return next(new ErrorResponse("الحساب معطل، يرجى التواصل مع الإدارة", 403));
  }

  // تحديث آخر تسجيل دخول
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // إنشاء JWT Token
  const token = generateToken(user._id);

  // الحصول على ملف الدكتور إذا كان دكتور
  let doctorProfile = null;
  if (user.role === "doctor") {
    doctorProfile = await Doctor.findOne({ user: user._id }).select(
      "specialty specialtyArabic isVerified isAvailable rating"
    );
  }

  successResponse(res, 200, "تم تسجيل الدخول بنجاح", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      isEmailVerified: user.isEmailVerified,
      ...(doctorProfile && { doctorProfile }),
    },
    token,
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("-password").populate({
    path: "doctorProfile",
    select:
      "specialty specialtyArabic isVerified isAvailable rating consultationFee",
  });

  successResponse(res, 200, "تم الحصول على البيانات بنجاح", { user });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (phone && phone !== user.phone) {
    // التحقق من أن الرقم غير مستخدم
    const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
    if (phoneExists) {
      return next(new ErrorResponse("رقم الهاتف مستخدم بالفعل", 400));
    }
    user.phone = phone;
  }

  await user.save();

  successResponse(res, 200, "تم تحديث الملف الشخصي بنجاح", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
    },
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  // التحقق من كلمة المرور الحالية
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse("كلمة المرور الحالية غير صحيحة", 401));
  }

  // تحديث كلمة المرور
  user.password = newPassword;
  await user.save();

  // إنشاء Token جديد
  const token = generateToken(user._id);

  successResponse(res, 200, "تم تغيير كلمة المرور بنجاح", { token });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(
      new ErrorResponse("لا يوجد مستخدم بهذا البريد الإلكتروني", 404)
    );
  }

  // توليد Reset Token
  const resetToken = crypto.randomBytes(32).toString("hex");

  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 دقيقة

  await user.save({ validateBeforeSave: false });

  // إرسال الإيميل
  try {
    await sendResetPasswordEmail(user.email, resetToken);

    successResponse(
      res,
      200,
      "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
    );
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse("خطأ في إرسال البريد الإلكتروني", 500));
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash الـ Token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // البحث عن المستخدم
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("الرابط غير صحيح أو منتهي الصلاحية", 400));
  }

  // تحديث كلمة المرور
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // إنشاء Token جديد
  const jwtToken = generateToken(user._id);

  successResponse(res, 200, "تم إعادة تعيين كلمة المرور بنجاح", {
    token: jwtToken,
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("الرابط غير صحيح أو منتهي الصلاحية", 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, "تم تفعيل البريد الإلكتروني بنجاح");
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.isEmailVerified) {
    return next(new ErrorResponse("البريد الإلكتروني مفعل بالفعل", 400));
  }

  // توليد Token جديد
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // إرسال الإيميل
  await sendVerificationEmail(user.email, verificationToken);

  successResponse(res, 200, "تم إرسال رابط التفعيل إلى بريدك الإلكتروني");
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  // في JWT، الـ logout يتم من جانب العميل بحذف الـ Token
  // لكن يمكن إضافة Token إلى Blacklist إذا لزم الأمر

  successResponse(res, 200, "تم تسجيل الخروج بنجاح");
});

// Helper Functions

// إرسال إيميل التفعيل
const sendVerificationEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const message = `
    <h1>تفعيل البريد الإلكتروني</h1>
    <p>مرحباً،</p>
    <p>يرجى النقر على الرابط التالي لتفعيل بريدك الإلكتروني:</p>
    <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">تفعيل البريد</a>
    <p>أو نسخ هذا الرابط في المتصفح:</p>
    <p>${verificationUrl}</p>
    <p>هذا الرابط صالح لمدة 24 ساعة.</p>
  `;

  await transporter.sendMail({
    from: `"منصة الصيدلية" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "تفعيل البريد الإلكتروني",
    html: message,
  });
};

// إرسال إيميل إعادة تعيين كلمة المرور
const sendResetPasswordEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const message = `
    <h1>إعادة تعيين كلمة المرور</h1>
    <p>مرحباً،</p>
    <p>لقد طلبت إعادة تعيين كلمة المرور. يرجى النقر على الرابط التالي:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">إعادة تعيين كلمة المرور</a>
    <p>أو نسخ هذا الرابط في المتصفح:</p>
    <p>${resetUrl}</p>
    <p>هذا الرابط صالح لمدة 30 دقيقة.</p>
    <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
  `;

  await transporter.sendMail({
    from: `"منصة الصيدلية" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "إعادة تعيين كلمة المرور",
    html: message,
  });
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  logout,
};
