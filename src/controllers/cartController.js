const Cart = require("../models/Cart");
const Product = require("../models/Product");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
} = require("../middleware/errorHandler");

/**
 * @desc    Sync localStorage cart to database
 * @route   POST /api/v1/cart/sync
 * @access  Private/Customer
 */
const syncCart = asyncHandler(async (req, res, next) => {
  const { items } = req.body;

  console.log('📦 Syncing cart for user:', req.user._id);
  console.log('📦 Items received:', items);

  // Validate items
  if (!items || !Array.isArray(items)) {
    console.error('❌ Invalid items format');
    return next(new ErrorResponse('Invalid cart items', 400));
  }

  // If items is empty, clear the cart
  if (items.length === 0) {
    await Cart.deleteOne({ user: req.user._id });
    console.log('✅ Cart cleared for user:', req.user._id);
    return successResponse(res, 200, 'تم مسح السلة', { cart: null });
  }

  // Process and validate items
  const validItems = [];
  
  for (const item of items) {
    // Extract product ID - handle multiple formats
    // Format 1: item.product._id (nested object)
    // Format 2: item.product (direct ID string)
    // Format 3: item._id (product sent as full object - THIS IS THE ACTUAL FORMAT FROM FRONTEND)
    const productId = item.product?._id || item.product || item._id;
    
    if (!productId) {
      console.warn('⚠️ Skipping item without product ID:', item);
      continue;
    }
    
    console.log('✅ Found product ID:', productId);

    // Verify product exists
    const product = await Product.findById(productId);
    
    if (!product) {
      console.warn(`⚠️ Product ${productId} not found, skipping`);
      continue;
    }

    validItems.push({
      product: product._id,
      quantity: item.quantity || 1,
      price: item.price || product.price,
      name: product.name,
      image: product.images?.[0]?.url || null
    });
  }

  if (validItems.length === 0) {
    console.error('❌ No valid items to sync');
    return next(new ErrorResponse('No valid items to sync', 400));
  }

  // Delete existing cart
  await Cart.deleteOne({ user: req.user._id });

  // Create new cart
  const cart = await Cart.create({
    user: req.user._id,
    items: validItems
  });

  // Populate product details
  await cart.populate('items.product');

  console.log('✅ Cart synced successfully:', cart._id);
  console.log('✅ Total items:', cart.items.length);

  successResponse(res, 200, 'تم مزامنة السلة بنجاح', {
    cart,
    itemCount: validItems.length
  });
});

/**
 * @desc    Get user's cart
 * @route   GET /api/v1/cart
 * @access  Private/Customer
 */
const getCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product');

  if (!cart) {
    return successResponse(res, 200, 'السلة فارغة', { cart: null });
  }

  successResponse(res, 200, 'السلة', { cart });
});

/**
 * @desc    Get cart summary
 * @route   GET /api/v1/cart/summary
 * @access  Private/Customer
 */
const getCartSummary = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product');

  if (!cart || !cart.items || cart.items.length === 0) {
    return successResponse(res, 200, 'السلة فارغة', {
      totalItems: 0,
      subtotal: 0,
      tax: 0,
      total: 0
    });
  }

  const subtotal = cart.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const tax = subtotal * 0.14;
  const deliveryFee = 30;
  const total = subtotal + tax + deliveryFee;

  successResponse(res, 200, 'ملخص السلة', {
    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    deliveryFee,
    total: Math.round(total * 100) / 100
  });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart
 * @access  Private/Customer
 */
const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return next(new ErrorResponse('Product ID and quantity required', 400));
  }

  // Verify product exists
  const product = await Product.findById(productId);
  
  if (!product) {
    return next(new ErrorResponse('المنتج غير موجود', 404));
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [{
        product: productId,
        quantity,
        price: product.price,
        name: product.name,
        image: product.images?.[0]?.url || null
      }]
    });
  } else {
    // Check if product already in cart
    const existingItem = cart.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        name: product.name,
        image: product.images?.[0]?.url || null
      });
    }

    await cart.save();
  }

  await cart.populate('items.product');

  successResponse(res, 200, 'تمت إضافة المنتج للسلة', { cart });
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/v1/cart/:productId
 * @access  Private/Customer
 */
const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return next(new ErrorResponse('الكمية يجب أن تكون 1 أو أكثر', 400));
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new ErrorResponse('السلة غير موجودة', 404));
  }

  const item = cart.items.find(
    item => item.product.toString() === productId
  );

  if (!item) {
    return next(new ErrorResponse('المنتج غير موجود في السلة', 404));
  }

  item.quantity = quantity;
  await cart.save();
  await cart.populate('items.product');

  successResponse(res, 200, 'تم تحديث الكمية', { cart });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/item/:productId
 * @access  Private/Customer
 */
const removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new ErrorResponse('السلة غير موجودة', 404));
  }

  cart.items = cart.items.filter(
    item => item.product.toString() !== productId
  );

  await cart.save();
  await cart.populate('items.product');

  successResponse(res, 200, 'تم حذف المنتج من السلة', { cart });
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/v1/cart/clear
 * @access  Private/Customer
 */
const clearCart = asyncHandler(async (req, res, next) => {
  await Cart.deleteOne({ user: req.user._id });
  
  successResponse(res, 200, 'تم مسح السلة', { cart: null });
});

module.exports = {
  syncCart,
  getCart,
  getCartSummary,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};