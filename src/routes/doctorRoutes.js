// ✅ doctorRoutes.js - FIXED WITH DASHBOARD ROUTE
// Path: backend/routes/doctorRoutes.js

const express = require("express");
const router = express.Router();
const {
  createDoctorProfile,
  getDoctors,
  getDoctorById,
  updateDoctorProfile,
  getMyProfile,
  toggleAvailability,
  updateAvailableTimes,
  getDoctorConsultations,
  getUpcomingConsultations,
  verifyDoctor,
  rejectDoctor,
  searchDoctors,
  getDoctorStats,
  getDoctorsBySpecialty,
  uploadVerificationDocuments,
} = require("../controllers/doctorController");

// ✅ ADDED: Import dashboard controller
const { getDoctorDashboard } = require("../controllers/dashboardController");

const { protect, optionalAuth } = require("../middleware/auth");
const {
  isDoctor,
  isVerifiedDoctor,
  isAdmin,
  anyRole,
} = require("../middleware/roleCheck");
const { uploadDocuments } = require("../middleware/upload");
const {
  validateDoctorProfile,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

// Public routes (but require authentication for privacy)
router.get("/", protect, validatePagination, getDoctors);
router.get("/search", protect, searchDoctors);
router.get("/specialty/:specialty", protect, getDoctorsBySpecialty);
router.get("/:id", protect, validateObjectId("id"), getDoctorById);

// Protected routes
router.use(protect);

// ✅ ADDED: Dashboard route
// IMPORTANT: Must be BEFORE /me/profile to avoid route conflicts
// This handles GET /api/doctors/dashboard
router.get("/dashboard", isDoctor, getDoctorDashboard);

// Doctor routes
router.post("/profile", isDoctor, validateDoctorProfile, createDoctorProfile);
router.get("/me/profile", isDoctor, getMyProfile);
router.put("/profile", isDoctor, updateDoctorProfile);
router.put("/availability", isDoctor, toggleAvailability);
router.put("/available-times", isDoctor, updateAvailableTimes);
router.get("/me/consultations", isDoctor, getDoctorConsultations);
router.get(
  "/consultations/upcoming",
  isVerifiedDoctor,
  getUpcomingConsultations
);
router.post(
  "/verification-documents",
  isDoctor,
  uploadDocuments("verificationDocuments", 5),
  uploadVerificationDocuments
);

// Admin routes
router.get("/admin/stats", isAdmin, getDoctorStats);
router.put("/:id/verify", isAdmin, validateObjectId("id"), verifyDoctor);
router.put("/:id/reject", isAdmin, validateObjectId("id"), rejectDoctor);

module.exports = router;