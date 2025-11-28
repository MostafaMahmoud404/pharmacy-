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
const path = require("path");
const fs = require("fs");

// ========================================
// EMAIL CONFIGURATION
// ========================================

// إنشاء transporter للإيميل
const createEmailTransporter = () => {
  // التحقق من وجود إعدادات الإيميل
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_PORT ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    console.warn("⚠️  Email configuration is missing in environment variables");
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } catch (error) {
    console.error("❌ Error creating email transporter:", error.message);
    return null;
  }
};

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

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

  // محاولة إرسال إيميل التفعيل
  try {
    await sendVerificationEmail(user.email, verificationToken, user.name);
    console.log("✅ Verification email sent successfully");
  } catch (error) {
    console.warn("⚠️  Could not send verification email:", error.message);
    // نكمل التسجيل حتى لو فشل الإيميل
  }

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
    ...(process.env.NODE_ENV === "development" && {
      verificationToken,
      verificationUrl: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/verify-email/${verificationToken}`,
    }),
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(
      new ErrorResponse("يرجى إدخال البريد الإلكتروني وكلمة المرور", 400)
    );
  }

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

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

  successResponse(res, 200, "تم الحصول على البيانات بنجاح", { user });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

  if (name) user.name = name;

  if (phone && phone !== user.phone) {
    // التحقق من أن الرقم غير مستخدم
    const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
    if (phoneExists) {
      return next(new ErrorResponse("رقم الهاتف مستخدم بالفعل", 400));
    }
    user.phone = phone;
  }

  // معالجة صورة الملف الشخصي إذا تم رفعها
  if (req.file) {
    // حذف الصورة القديمة إن وجدت
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, "..", user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          console.log("✅ Old profile image deleted");
        } catch (error) {
          console.warn("⚠️  Could not delete old image:", error.message);
        }
      }
    }

    // حفظ مسار الصورة الجديدة
    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    console.log("✅ New profile image uploaded:", user.profileImage);
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

  if (!currentPassword || !newPassword) {
    return next(
      new ErrorResponse("يرجى إدخال كلمة المرور الحالية والجديدة", 400)
    );
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

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

  if (!email) {
    return next(new ErrorResponse("يرجى إدخال البريد الإلكتروني", 400));
  }

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

  // محاولة إرسال الإيميل
  try {
    await sendResetPasswordEmail(email, resetToken, user.name);

    successResponse(
      res,
      200,
      "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
      {
        ...(process.env.NODE_ENV === "development" && {
          resetToken,
          resetUrl: `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/reset-password/${resetToken}`,
          message: "في وضع التطوير: استخدم الرابط أعلاه",
        }),
      }
    );
  } catch (error) {
    console.error("❌ Error sending reset email:", error.message);

    // في Development، نرجع الـ Token في الـ Response
    if (process.env.NODE_ENV === "development") {
      return successResponse(
        res,
        200,
        "تم إنشاء رابط إعادة تعيين كلمة المرور",
        {
          resetToken,
          resetUrl: `${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/reset-password/${resetToken}`,
          apiResetUrl: `${
            process.env.BACKEND_URL || "http://localhost:5000"
          }/api/auth/reset-password/${resetToken}`,
          message:
            "📝 في Postman: استخدم POST للرابط apiResetUrl مع Body يحتوي على password و confirmPassword",
          warning: "الإيميل معطل في وضع التطوير",
        }
      );
    }

    // في Production، نحذف الـ Token ونرجع خطأ
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new ErrorResponse(
        "خطأ في إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً",
        500
      )
    );
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return next(new ErrorResponse("يرجى إدخال كلمة المرور الجديدة", 400));
  }

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

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

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

  // محاولة إرسال الإيميل
  try {
    await sendVerificationEmail(user.email, verificationToken, user.name);
    successResponse(res, 200, "تم إرسال رابط التفعيل إلى بريدك الإلكتروني");
  } catch (error) {
    console.error("❌ Error sending verification email:", error.message);

    if (process.env.NODE_ENV === "development") {
      return successResponse(res, 200, "تم إنشاء رابط التفعيل", {
        verificationToken,
        verificationUrl: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/verify-email/${verificationToken}`,
        warning: "الإيميل معطل في وضع التطوير",
      });
    }

    return next(
      new ErrorResponse(
        "خطأ في إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً",
        500
      )
    );
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  // في JWT، الـ logout يتم من جانب العميل بحذف الـ Token
  successResponse(res, 200, "تم تسجيل الخروج بنجاح");
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// إرسال إيميل التفعيل
const sendVerificationEmail = async (email, token, name) => {
  const transporter = createEmailTransporter();

  if (!transporter) {
    throw new Error("Email service is not configured");
  }

  const verificationUrl = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/verify-email/${token}`;

  const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>تفعيل البريد الإلكتروني</h1>
        </div>
        <div class="content">
          <p>مرحباً ${name},</p>
          <p>شكراً لتسجيلك في منصة الصيدلية. يرجى النقر على الزر التالي لتفعيل بريدك الإلكتروني:</p>
          <center>
            <a href="${verificationUrl}" class="button">تفعيل البريد الإلكتروني</a>
          </center>
          <p>أو نسخ هذا الرابط في المتصفح:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p><strong>هذا الرابط صالح لمدة 24 ساعة.</strong></p>
          <p>إذا لم تقم بالتسجيل في منصتنا، يرجى تجاهل هذا البريد.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 منصة الصيدلية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"منصة الصيدلية" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "تفعيل البريد الإلكتروني - منصة الصيدلية",
    html: message,
  });
};

// إرسال إيميل إعادة تعيين كلمة المرور
const sendResetPasswordEmail = async (email, token, name) => {
  const transporter = createEmailTransporter();

  if (!transporter) {
    throw new Error("Email service is not configured");
  }

  // الرابط للـ Frontend (سيرسل الـ token للـ API)
  const resetUrl = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/reset-password/${token}`;

  // الرابط المباشر للـ API (للاختبار في Development)
  const apiResetUrl = `${
    process.env.BACKEND_URL || "http://localhost:5000"
  }/api/auth/reset-password/${token}`;

  const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 15px 0; border-radius: 5px; }
        .code-box { background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>إعادة تعيين كلمة المرور</h1>
        </div>
        <div class="content">
          <p>مرحباً ${name},</p>
          <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يرجى النقر على الزر التالي للمتابعة:</p>
          <center>
            <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
          </center>
          <p>أو نسخ هذا الرابط في المتصفح:</p>
          <div class="code-box">${resetUrl}</div>
          
          ${
            process.env.NODE_ENV === "development"
              ? `
          <div class="warning">
            <p><strong>🔧 وضع التطوير - استخدم الرابط التالي مباشرة في Postman:</strong></p>
            <div class="code-box">POST ${apiResetUrl}</div>
            <p>مع Body:</p>
            <div class="code-box">
              {
                "password": "كلمة_المرور_الجديدة",
                "confirmPassword": "كلمة_المرور_الجديدة"
              }
            </div>
          </div>
          `
              : ""
          }
          
          <div class="warning">
            <p><strong>⏰ هذا الرابط صالح لمدة 30 دقيقة فقط.</strong></p>
          </div>
          <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد. حسابك آمن ولم يتم إجراء أي تغييرات.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 منصة الصيدلية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"منصة الصيدلية" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "إعادة تعيين كلمة المرور - منصة الصيدلية",
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
