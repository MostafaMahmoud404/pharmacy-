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

// Public routes
router.get("/", optionalAuth, validatePagination, getDoctors);
router.get("/search", searchDoctors);
router.get("/specialty/:specialty", getDoctorsBySpecialty);
router.get("/:id", validateObjectId("id"), getDoctorById);

// Protected routes
router.use(protect);

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
