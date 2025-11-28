const express = require("express");
const router = express.Router();
const {
  getAdminDashboard,
  getDoctorDashboard,
  getPharmacistDashboard,
  getCustomerDashboard,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");
const { isAdmin, isDoctor, anyRole } = require("../middleware/roleCheck");

router.use(protect);

// Admin Dashboard
router.get("/admin", isAdmin, getAdminDashboard);

// Doctor Dashboard
router.get("/doctor", isDoctor, getDoctorDashboard);

// Pharmacist Dashboard
router.get(
  "/pharmacist",
  anyRole("pharmacist", "admin"),
  getPharmacistDashboard
);

// Customer Dashboard
router.get("/customer", getCustomerDashboard);

module.exports = router;
