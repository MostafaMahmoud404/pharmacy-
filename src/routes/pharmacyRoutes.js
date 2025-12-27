const express = require("express");
const router = express.Router();

const {
  getPharmacies,
  getPharmacyById,
  getMyPharmacy,
  updateMyPharmacy,
  uploadPharmacyImage,
  toggleAvailability,
  getPharmacyProducts,
  getPharmacyStats,
  verifyPharmacy,
  deletePharmacy,
} = require("../controllers/pharmacyController");

const { protect } = require("../middleware/auth");
const { isAdmin, isPharmacist } = require("../middleware/roleCheck");
const { uploadSingle } = require("../middleware/upload");
const { validateObjectId, validatePagination } = require("../middleware/validation");

// ===== PUBLIC ROUTES =====

/**
 * @route   GET /api/pharmacies
 * @desc    Get all pharmacies with filters
 * @access  Public
 */
router.get("/", validatePagination, getPharmacies);

/**
 * @route   GET /api/pharmacies/:id
 * @desc    Get single pharmacy by ID
 * @access  Public
 */
router.get("/:id", validateObjectId("id"), getPharmacyById);

/**
 * @route   GET /api/pharmacies/:id/products
 * @desc    Get all products for a specific pharmacy
 * @access  Public
 */
router.get("/:id/products", validateObjectId("id"), validatePagination, getPharmacyProducts);

// ===== PROTECTED ROUTES (Pharmacist only) =====

// Apply authentication
router.use(protect);

/**
 * @route   GET /api/pharmacies/me
 * @desc    Get logged-in pharmacist's pharmacy profile
 * @access  Private/Pharmacist
 */
router.get("/me/profile", isPharmacist, getMyPharmacy);

/**
 * @route   PUT /api/pharmacies/me
 * @desc    Update pharmacy profile
 * @access  Private/Pharmacist
 */
router.put("/me/profile", isPharmacist, updateMyPharmacy);

/**
 * @route   PUT /api/pharmacies/me/image
 * @desc    Upload pharmacy image
 * @access  Private/Pharmacist
 */
router.put(
  "/me/image",
  isPharmacist,
  uploadSingle("pharmacyImage"),
  uploadPharmacyImage
);

/**
 * @route   PUT /api/pharmacies/me/availability
 * @desc    Toggle pharmacy availability (open/closed)
 * @access  Private/Pharmacist
 */
router.put("/me/availability", isPharmacist, toggleAvailability);

/**
 * @route   GET /api/pharmacies/me/stats
 * @desc    Get pharmacy statistics
 * @access  Private/Pharmacist
 */
router.get("/me/stats", isPharmacist, getPharmacyStats);

// ===== ADMIN ROUTES =====

/**
 * @route   PUT /api/pharmacies/:id/verify
 * @desc    Verify pharmacy (Admin only)
 * @access  Private/Admin
 */
router.put("/:id/verify", isAdmin, validateObjectId("id"), verifyPharmacy);

/**
 * @route   DELETE /api/pharmacies/:id
 * @desc    Delete pharmacy (Admin only)
 * @access  Private/Admin
 */
router.delete("/:id", isAdmin, validateObjectId("id"), deletePharmacy);

module.exports = router;