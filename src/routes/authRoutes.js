// routes/auth.js
const express = require("express");
const router = express.Router();

// ===== IMPORTS =====

// Multer from config
const { uploadDocument } = require("../config/multer");

// Controllers
const {
  register,
  registerDoctor,
  registerPharmacy,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  logout,
} = require("../controllers/authController");

// Validation Middleware
const {
  validateRegistration,
  validateDoctorRegistration,
  validatePharmacyRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateUpdatePassword,
} = require("../middleware/validation");

// Auth Middleware
const { protect, loginRateLimit } = require("../middleware/auth");

console.log("✅ Loading Auth Routes...");

// ===== PUBLIC ROUTES =====

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer user
 * @access  Public
 */
router.post("/register", validateRegistration, register);

/**
 * @route   POST /api/auth/register-doctor
 * @desc    Register a new doctor user with license file
 * @access  Public
 */
router.post(
  "/register-doctor",
  uploadDocument.single("licenseFile"), // ✅ Multer middleware for file upload
  validateDoctorRegistration, // ✅ Validation rules
  registerDoctor // ✅ Controller
);

/**
 * @route   POST /api/auth/register-pharmacy
 * @desc    Register a new pharmacy with license file
 * @access  Public
 */
router.post(
  "/register-pharmacy",
  uploadDocument.single("licenseFile"), // ✅ رفع ملف الترخيص
  validatePharmacyRegistration, // ✅ التحقق من البيانات
  registerPharmacy // ✅ Controller
);


/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post("/login", loginRateLimit, validateLogin, login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset link to email
 * @access  Public
 */
router.post("/forgot-password", loginRateLimit, validateEmail, forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token from email
 * @access  Public
 */
router.post("/reset-password/:token", validatePasswordReset, resetPassword);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address with token
 * @access  Public
 */
router.get("/verify-email/:token", verifyEmail);

// ===== PROTECTED ROUTES (Requires Authentication) =====

// Apply protect middleware to all routes below
router.use(protect);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user information
 * @access  Private
 */
router.get("/me", getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile information
 * @access  Private
 */
router.put("/profile", updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Change user password
 * @access  Private
 */
router.put("/password", validateUpdatePassword, updatePassword);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Private
 */
router.post("/resend-verification", resendVerification);

/**
 * @route   PUT /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.put("/reset-password/:token", validatePasswordReset, resetPassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token deletion)
 * @access  Private
 */
router.post("/logout", logout);

console.log("✅ Auth Routes Loaded Successfully");

module.exports = router;
