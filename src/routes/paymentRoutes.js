const express = require("express");
const router = express.Router();
const {
  processCashPayment,
  createPaymobToken,
  paymobCallback,
  getPaymentStatus,
  getPaymentMethods
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const { isCustomer } = require("../middleware/roleCheck");

// ========================================
// PUBLIC ROUTES (No authentication needed)
// ========================================

// ✅ Paymob webhook callback - MUST be public
// This endpoint receives payment confirmation from Paymob servers
router.post("/paymob/callback", paymobCallback);

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

router.use(protect); // ✅ كل الـ routes اللي تحت محتاجة authentication

// ✅ Get available payment methods
router.get("/methods", getPaymentMethods);

// ✅ Get payment status
// Allow customer to check their own order, pharmacist/admin can check any order
router.get("/status/:orderId", getPaymentStatus);

// ========================================
// CUSTOMER ONLY ROUTES
// ========================================

// ✅ Cash on delivery payment
// Customer creates order with cash payment method
router.post("/cash", isCustomer, processCashPayment);

// ✅ Create Paymob payment token (card payment)
// Customer initiates card payment and gets iframe URL
router.post("/paymob/create-token", isCustomer, createPaymobToken);

// ========================================
// OPTIONAL: Additional payment routes (if needed)
// ========================================

// Uncomment if you want to add these features later:

// // Refund payment (admin/pharmacist only)
// router.post("/refund/:orderId", protect, isPharmacistOrAdmin, refundPayment);

// // Get payment history for current user
// router.get("/history", isCustomer, getPaymentHistory);

// // Get all payments (admin only)
// router.get("/all", protect, isAdmin, getAllPayments);

// // Cancel pending payment (customer only)
// router.post("/cancel/:orderId", isCustomer, cancelPayment);

// // Verify payment manually (admin only)
// router.post("/verify/:orderId", protect, isAdmin, verifyPayment);

module.exports = router;