const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/authController");
const { protect, loginRateLimit } = require("../middleware/auth");
const {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateUpdatePassword,
} = require("../middleware/validation");
const { uploadSingle } = require("../middleware/upload");

// ========================================
// PUBLIC ROUTES
// ========================================

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post("/register", validateRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", loginRateLimit, validateLogin, login);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", validateEmail, forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post("/reset-password/:token", validatePasswordReset, resetPassword);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email with token
// @access  Public
router.get("/verify-email/:token", verifyEmail);

// ========================================
// PROTECTED ROUTES
// ========================================

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get("/me", protect, getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  uploadSingle("profileImage", 5 * 1024 * 1024),
  updateProfile
);

// @route   PUT /api/auth/password
// @desc    Update password
// @access  Private
router.put("/password", protect, validateUpdatePassword, updatePassword);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Private
router.post("/resend-verification", protect, resendVerification);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", protect, logout);

module.exports = router;
