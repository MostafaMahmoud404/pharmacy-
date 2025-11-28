const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  confirmPayment,
  updateOrderStatus,
  cancelOrder,
  assignDeliveryPerson,
  verifyPrescription,
  getOrderStats,
  rateOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const {
  isCustomer,
  anyRole,
  isAdmin,
  canAccessOrder,
} = require("../middleware/roleCheck");
const {
  validateOrder,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

router.use(protect);

// Customer routes
router.post("/", isCustomer, validateOrder, createOrder);
router.get("/my", isCustomer, validatePagination, getMyOrders);
router.post(
  "/:id/confirm-payment",
  isCustomer,
  validateObjectId("id"),
  confirmPayment
);
router.post("/:id/rate", isCustomer, validateObjectId("id"), rateOrder);

// Admin/Pharmacist routes
router.get(
  "/",
  anyRole("admin", "pharmacist"),
  validatePagination,
  getAllOrders
);
router.put(
  "/:id/status",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  updateOrderStatus
);
router.put(
  "/:id/assign-delivery",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  assignDeliveryPerson
);
router.post(
  "/:id/verify-prescription",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  verifyPrescription
);

// Shared routes
router.get("/:id", validateObjectId("id"), canAccessOrder, getOrderById);
router.post("/:id/cancel", validateObjectId("id"), cancelOrder);

// Admin only
router.get("/admin/stats", isAdmin, getOrderStats);

module.exports = router;
