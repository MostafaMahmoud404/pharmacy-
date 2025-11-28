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
  validateProduct,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

// Public routes
router.get("/", optionalAuth, validatePagination, getProducts);
router.get("/search", searchProducts);
router.get("/featured", getFeaturedProducts);
router.get("/best-selling", getBestSellingProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/:id", validateObjectId("id"), getProductById);

// Protected routes
router.use(protect);

// Admin/Pharmacist routes
router.post(
  "/",
  anyRole("admin", "pharmacist"),
  validateProduct,
  createProduct
);
router.put(
  "/:id",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  updateProduct
);
router.delete("/:id", isAdmin, validateObjectId("id"), deleteProduct);
router.post(
  "/:id/images",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  uploadMultiple("productImages", 5),
  uploadProductImages
);
router.delete(
  "/:id/images/:imageId",
  anyRole("admin", "pharmacist"),
  deleteProductImage
);
router.put(
  "/:id/images/:imageId/main",
  anyRole("admin", "pharmacist"),
  setMainImage
);
router.put(
  "/:id/stock",
  anyRole("admin", "pharmacist"),
  validateObjectId("id"),
  updateStock
);

// Admin only
router.get(
  "/admin/low-stock",
  anyRole("admin", "pharmacist"),
  getLowStockProducts
);
router.get("/admin/stats", isAdmin, getProductStats);

module.exports = router;
