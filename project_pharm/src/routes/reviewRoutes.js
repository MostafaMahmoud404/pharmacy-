const express = require("express");
const router = express.Router();
const {
  createDoctorReview,
  createProductReview,
  getDoctorReviews,
  getProductReviews,
  updateReview,
  deleteReview,
  voteReview,
  addResponse,
  reportReview,
  getPendingReviews,
  approveReview,
  rejectReview,
  getMyReviews,
} = require("../controllers/reviewController");
const { protect, optionalAuth } = require("../middleware/auth");
const { isCustomer, isAdmin, anyRole } = require("../middleware/roleCheck");
const {
  validateReview,
  validateObjectId,
} = require("../middleware/validation");

// Public routes
router.get(
  "/doctor/:doctorId",
  optionalAuth,
  validateObjectId("doctorId"),
  getDoctorReviews
);
router.get(
  "/product/:productId",
  optionalAuth,
  validateObjectId("productId"),
  getProductReviews
);

// Protected routes
router.use(protect);

// Customer routes
router.post(
  "/doctor/:doctorId",
  isCustomer,
  validateObjectId("doctorId"),
  validateReview,
  createDoctorReview
);
router.post(
  "/product/:productId",
  isCustomer,
  validateObjectId("productId"),
  validateReview,
  createProductReview
);
router.get("/my", getMyReviews);

// Shared routes
router.put("/:id", validateObjectId("id"), updateReview);
router.delete("/:id", validateObjectId("id"), deleteReview);
router.post("/:id/vote", validateObjectId("id"), voteReview);
router.post("/:id/response", validateObjectId("id"), addResponse);
router.post("/:id/report", validateObjectId("id"), reportReview);

// Admin routes
router.get("/admin/pending", isAdmin, getPendingReviews);
router.put("/:id/approve", isAdmin, validateObjectId("id"), approveReview);
router.put("/:id/reject", isAdmin, validateObjectId("id"), rejectReview);

module.exports = router;
