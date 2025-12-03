const express = require("express");
const router = express.Router();
const {
  createPrescription,
  getPrescriptionById,
  getMyPrescriptions,
  getDoctorPrescriptions,
  sendToPharmacy,
  downloadPrescription,
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
} = require("../controllers/prescriptionController");
const { protect } = require("../middleware/auth");
const {
  isVerifiedDoctor,
  isCustomer,
  anyRole,
} = require("../middleware/roleCheck");
const {
  validatePrescription,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

router.use(protect);

// Customer routes
router.get("/my", isCustomer, validatePagination, getMyPrescriptions);

// Doctor routes
router.post("/", isVerifiedDoctor, validatePrescription, createPrescription);
router.get(
  "/doctor/my",
  isVerifiedDoctor,
  validatePagination,
  getDoctorPrescriptions
);

// Pharmacist routes
router.get(
  "/pharmacy",
  anyRole("pharmacist", "admin"),
  validatePagination,
  getPharmacyPrescriptions
);

// Shared routes
router.get("/:id", validateObjectId("id"), getPrescriptionById);
router.post("/:id/send-to-pharmacy", validateObjectId("id"), sendToPharmacy);
router.get("/:id/download", validateObjectId("id"), downloadPrescription);

// Admin/Pharmacist routes
router.put(
  "/:id/status",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  updatePrescriptionStatus
);

module.exports = router;
