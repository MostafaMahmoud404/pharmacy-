const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  setMainImage,
  updateStock,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getBestSellingProducts,
  getLowStockProducts,
  getProductStats,
} = require("../controllers/productController");

const { protect, optionalAuth } = require("../middleware/auth");
const { anyRole, isAdmin } = require("../middleware/roleCheck");
const { uploadMultiple } = require("../middleware/upload");
const {
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

// =======================
// Public routes
// =======================
router.get("/", optionalAuth, validatePagination, getProducts);
router.get("/search", searchProducts);
router.get("/featured", getFeaturedProducts);
router.get("/best-selling", getBestSellingProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/:id", validateObjectId("id"), getProductById);

// =======================
// Protected routes
// =======================
router.use(protect);

// =======================
// Admin / Pharmacist routes
// =======================

// Create product
router.post(
  "/",
  anyRole("admin", "pharmacist"),
  uploadMultiple("images", 5),
  createProduct
);

// Update product
router.put(
  "/:id",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  uploadMultiple("images", 5),
  updateProduct
);

// ✅ DELETE PRODUCT (Admin + Pharmacist)
router.delete(
  "/:id",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  deleteProduct
);

// Upload product images
router.post(
  "/:id/images",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  uploadMultiple("images", 5),
  uploadProductImages
);

// Delete product image
router.delete(
  "/:id/images/:imageId",
  anyRole("admin", "pharmacist"),
  deleteProductImage
);

// Set main image
router.put(
  "/:id/images/:imageId/main",
  anyRole("admin", "pharmacist"),
  setMainImage
);

// Update stock
router.put(
  "/:id/stock",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  updateStock
);

// =======================
// Admin only routes
// =======================

// Low stock products (Admin + Pharmacist)
router.get(
  "/admin/low-stock",
  anyRole("admin", "pharmacist"),
  getLowStockProducts
);

// Product statistics (Admin only)
router.get("/admin/stats", isAdmin, getProductStats);

module.exports = router;
