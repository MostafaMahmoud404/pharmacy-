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
const {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateUpdatePassword,
} = require("../middleware/validation");
const { protect, loginRateLimit } = require("../middleware/auth");

// Public routes
router.post("/register", validateRegistration, register);
router.post("/login", loginRateLimit, validateLogin, login);
router.post("/forgot-password", validateEmail, forgotPassword);
router.post("/reset-password/:token", validatePasswordReset, resetPassword);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.use(protect);
router.get("/me", getMe);
router.put("/profile", updateProfile);
router.put("/password", validateUpdatePassword, updatePassword);
router.post("/resend-verification", resendVerification);
router.post("/logout", logout);

module.exports = router;
