const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfileImage,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserStats,
  searchUsers,
  getUserActivity,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { isAdmin } = require("../middleware/roleCheck");
const { uploadSingle } = require("../middleware/upload");
const {
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

router.use(protect);

// Profile Image
router.put("/profile/image", uploadSingle("profileImage"), uploadProfileImage);

// Addresses
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

// Admin routes
router.get("/", isAdmin, validatePagination, getUsers);
router.get("/stats", isAdmin, getUserStats);
router.get("/search", isAdmin, searchUsers);
router.get("/:id", isAdmin, validateObjectId("id"), getUserById);
router.put("/:id", isAdmin, validateObjectId("id"), updateUser);
router.delete("/:id", isAdmin, validateObjectId("id"), deleteUser);
router.get("/:id/activity", isAdmin, validateObjectId("id"), getUserActivity);

module.exports = router;
