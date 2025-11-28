const express = require("express");
const router = express.Router();
const {
  processCashPayment,
  createStripePaymentIntent,
  confirmStripePayment,
  createPaymobToken,
  paymobCallback,
  payWithWallet,
  getPaymentMethods,
  getPaymentHistory,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const { isCustomer } = require("../middleware/roleCheck");

// Public routes
router.post("/paymob/callback", paymobCallback);

// Protected routes
router.use(protect);

// Get available payment methods
router.get("/methods", getPaymentMethods);

// Get payment history
router.get("/history", getPaymentHistory);

// Customer routes
router.post("/cash", isCustomer, processCashPayment);
router.post("/wallet", isCustomer, payWithWallet);

// Stripe
router.post("/stripe/create-intent", isCustomer, createStripePaymentIntent);
router.post("/stripe/confirm", isCustomer, confirmStripePayment);

// Paymob
router.post("/paymob/create-token", isCustomer, createPaymobToken);

module.exports = router;
