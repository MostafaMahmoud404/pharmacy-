const express = require("express");
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartSummary,
    syncCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const { isCustomer } = require("../middleware/roleCheck");

// ✅ كل الـ routes تحتاج authentication
router.use(protect);

// ✅ كل الـ routes محصورة على الـ customer
router.use(isCustomer);

// ========================================
// GET Routes
// ========================================

// Get cart summary (أول عشان مايتعارضش مع /)
router.get("/summary", getCartSummary);

// Get cart
router.get("/", getCart);

// ========================================
// POST Routes
// ========================================

// Sync cart (merge local with server) - قبل / عشان ما يتعارضش
router.post("/sync", syncCart);

// Add to cart
router.post("/", addToCart);

// ========================================
// PUT Routes
// ========================================

// Update cart item quantity
router.put("/:productId", updateCartItem);

// ========================================
// DELETE Routes
// ========================================

// Remove specific item from cart
router.delete("/item/:productId", removeFromCart);

// Clear entire cart (مسار مختلف عشان مافيش تعارض)
router.delete("/clear", clearCart);

module.exports = router;
