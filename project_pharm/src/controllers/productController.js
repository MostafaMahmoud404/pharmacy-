const Product = require("../models/Product");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");
const { deleteFile } = require("../middleware/upload");

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin/Pharmacist
const createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    nameArabic,
    description,
    scientificName,
    category,
    categoryArabic,
    subCategory,
    price,
    discountPrice,
    stock,
    manufacturer,
    requiresPrescription,
    dosageForm,
    strength,
    packSize,
    activeIngredients,
    usageInstructions,
    sideEffects,
    contraindications,
    warnings,
    storageConditions,
    expiryDate,
    barcode,
    sku,
    tags,
  } = req.body;

  // التحقق من SKU
  const skuExists = await Product.findOne({ sku });
  if (skuExists) {
    return next(new ErrorResponse("رمز المنتج (SKU) مستخدم بالفعل", 400));
  }

  // التحقق من Barcode
  if (barcode) {
    const barcodeExists = await Product.findOne({ barcode });
    if (barcodeExists) {
      return next(new ErrorResponse("الباركود مستخدم بالفعل", 400));
    }
  }

  // معالجة الصور المرفوعة
  let images = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map((file, index) => ({
      url: file.path,
      publicId: file.filename,
      isMain: index === 0,
    }));
  }

  const product = await Product.create({
    name,
    nameArabic,
    description,
    scientificName,
    category,
    categoryArabic,
    subCategory,
    price,
    discountPrice,
    stock,
    images,
    manufacturer,
    requiresPrescription,
    dosageForm,
    strength,
    packSize,
    activeIngredients,
    usageInstructions,
    sideEffects,
    contraindications,
    warnings,
    storageConditions,
    expiryDate,
    barcode,
    sku,
    tags,
    metadata: {
      createdBy: req.user._id,
    },
  });

  successResponse(res, 201, "تم إضافة المنتج بنجاح", { product });
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(Product.find({ isActive: true }), req.query)
    .search(["name", "nameArabic", "description", "scientificName"])
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;
  const total = await Product.countDocuments({
    isActive: true,
    ...features.query.getFilter(),
  });

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على المنتجات بنجاح",
    { products },
    pagination
  );
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  // زيادة عدد المشاهدات
  await product.incrementViews();

  // الحصول على المنتجات المشابهة
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(6)
    .select("name nameArabic price discountPrice images rating");

  successResponse(res, 200, "تم الحصول على المنتج بنجاح", {
    product,
    relatedProducts,
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin/Pharmacist
const updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  const {
    name,
    nameArabic,
    description,
    scientificName,
    category,
    categoryArabic,
    subCategory,
    price,
    discountPrice,
    stock,
    manufacturer,
    requiresPrescription,
    dosageForm,
    strength,
    packSize,
    activeIngredients,
    usageInstructions,
    sideEffects,
    contraindications,
    warnings,
    storageConditions,
    expiryDate,
    barcode,
    tags,
    isActive,
    isFeatured,
  } = req.body;

  // التحقق من Barcode
  if (barcode && barcode !== product.barcode) {
    const barcodeExists = await Product.findOne({
      barcode,
      _id: { $ne: product._id },
    });
    if (barcodeExists) {
      return next(new ErrorResponse("الباركود مستخدم بالفعل", 400));
    }
  }

  // تحديث الحقول
  if (name) product.name = name;
  if (nameArabic) product.nameArabic = nameArabic;
  if (description) product.description = description;
  if (scientificName) product.scientificName = scientificName;
  if (category) product.category = category;
  if (categoryArabic) product.categoryArabic = categoryArabic;
  if (subCategory) product.subCategory = subCategory;
  if (price !== undefined) product.price = price;
  if (discountPrice !== undefined) product.discountPrice = discountPrice;
  if (stock !== undefined) product.stock = stock;
  if (manufacturer) product.manufacturer = manufacturer;
  if (requiresPrescription !== undefined)
    product.requiresPrescription = requiresPrescription;
  if (dosageForm) product.dosageForm = dosageForm;
  if (strength) product.strength = strength;
  if (packSize) product.packSize = packSize;
  if (activeIngredients) product.activeIngredients = activeIngredients;
  if (usageInstructions) product.usageInstructions = usageInstructions;
  if (sideEffects) product.sideEffects = sideEffects;
  if (contraindications) product.contraindications = contraindications;
  if (warnings) product.warnings = warnings;
  if (storageConditions) product.storageConditions = storageConditions;
  if (expiryDate) product.expiryDate = expiryDate;
  if (barcode) product.barcode = barcode;
  if (tags) product.tags = tags;
  if (isActive !== undefined) product.isActive = isActive;
  if (isFeatured !== undefined) product.isFeatured = isFeatured;

  product.metadata.lastUpdatedBy = req.user._id;

  await product.save();

  successResponse(res, 200, "تم تحديث المنتج بنجاح", { product });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  // حذف الصور
  if (product.images && product.images.length > 0) {
    product.images.forEach((image) => {
      deleteFile(image.url);
    });
  }

  await product.deleteOne();

  successResponse(res, 200, "تم حذف المنتج بنجاح");
});

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private/Admin/Pharmacist
const uploadProductImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ErrorResponse("يرجى اختيار صور", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  // إضافة الصور الجديدة
  req.files.forEach((file, index) => {
    product.images.push({
      url: file.path,
      publicId: file.filename,
      isMain: product.images.length === 0 && index === 0,
    });
  });

  await product.save();

  successResponse(res, 200, "تم رفع الصور بنجاح", {
    images: product.images,
  });
});

// @desc    Delete product image
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private/Admin/Pharmacist
const deleteProductImage = asyncHandler(async (req, res, next) => {
  const { id, imageId } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  const image = product.images.id(imageId);

  if (!image) {
    return next(new ErrorResponse("الصورة غير موجودة", 404));
  }

  // حذف الملف
  deleteFile(image.url);

  // حذف من المصفوفة
  image.deleteOne();

  // إذا كانت الصورة الرئيسية، نجعل أول صورة رئيسية
  if (image.isMain && product.images.length > 0) {
    product.images[0].isMain = true;
  }

  await product.save();

  successResponse(res, 200, "تم حذف الصورة بنجاح", {
    images: product.images,
  });
});

// @desc    Set main product image
// @route   PUT /api/products/:id/images/:imageId/main
// @access  Private/Admin/Pharmacist
const setMainImage = asyncHandler(async (req, res, next) => {
  const { id, imageId } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  // إلغاء الصورة الرئيسية الحالية
  product.images.forEach((img) => {
    img.isMain = img._id.toString() === imageId;
  });

  await product.save();

  successResponse(res, 200, "تم تحديد الصورة الرئيسية بنجاح", {
    images: product.images,
  });
});

// @desc    Update product stock
// @route   PUT /api/products/:id/stock
// @access  Private/Admin/Pharmacist
const updateStock = asyncHandler(async (req, res, next) => {
  const { quantity, operation } = req.body;

  if (!quantity || !operation) {
    return next(new ErrorResponse("الكمية والعملية مطلوبة", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  await product.updateStock(quantity, operation);

  successResponse(res, 200, "تم تحديث المخزون بنجاح", {
    stock: product.stock,
  });
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;

  const features = new APIFeatures(
    Product.find({ category, isActive: true }),
    req.query
  )
    .sort()
    .paginate();

  const products = await features.query;
  const total = await Product.countDocuments({ category, isActive: true });

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(res, 200, `منتجات فئة ${category}`, { products }, pagination);
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = asyncHandler(async (req, res, next) => {
  const { q, category, minPrice, maxPrice, requiresPrescription } = req.query;

  if (!q || q.length < 2) {
    return next(new ErrorResponse("يجب أن يكون البحث حرفين على الأقل", 400));
  }

  let query = {
    isActive: true,
    $or: [
      { name: { $regex: q, $options: "i" } },
      { nameArabic: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { scientificName: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ],
  };

  if (category) {
    query.category = category;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (requiresPrescription !== undefined) {
    query.requiresPrescription = requiresPrescription === "true";
  }

  const products = await Product.find(query)
    .select(
      "name nameArabic price discountPrice images rating stock requiresPrescription"
    )
    .limit(20);

  successResponse(res, 200, "نتائج البحث", {
    products,
    count: products.length,
  });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .select("name nameArabic price discountPrice images rating")
    .limit(10);

  successResponse(res, 200, "المنتجات المميزة", {
    products,
    count: products.length,
  });
});

// @desc    Get best selling products
// @route   GET /api/products/best-selling
// @access  Public
const getBestSellingProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ isActive: true })
    .sort("-salesCount")
    .select("name nameArabic price discountPrice images rating salesCount")
    .limit(10);

  successResponse(res, 200, "الأكثر مبيعاً", {
    products,
    count: products.length,
  });
});

// @desc    Get low stock products (Admin/Pharmacist)
// @route   GET /api/products/low-stock
// @access  Private/Admin/Pharmacist
const getLowStockProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ isActive: true })
    .where("stock")
    .lte(10)
    .sort("stock")
    .select("name nameArabic stock lowStockThreshold sku");

  successResponse(res, 200, "المنتجات منخفضة المخزون", {
    products,
    count: products.length,
  });
});

// @desc    Get product statistics (Admin)
// @route   GET /api/products/stats
// @access  Private/Admin
const getProductStats = asyncHandler(async (req, res, next) => {
  const totalProducts = await Product.countDocuments();
  const activeProducts = await Product.countDocuments({ isActive: true });
  const outOfStock = await Product.countDocuments({ stock: 0 });
  const lowStock = await Product.countDocuments({
    stock: { $gt: 0, $lte: 10 },
  });
  const requiresPrescription = await Product.countDocuments({
    requiresPrescription: true,
  });

  // التوزيع حسب الفئة
  const categoryDistribution = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // أفضل المنتجات
  const topProducts = await Product.find({ isActive: true })
    .sort("-salesCount")
    .limit(10)
    .select("name nameArabic price salesCount rating");

  const stats = {
    total: totalProducts,
    active: activeProducts,
    outOfStock,
    lowStock,
    requiresPrescription,
    categoryDistribution,
    topProducts,
  };

  successResponse(res, 200, "تم الحصول على الإحصائيات بنجاح", { stats });
});

module.exports = {
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
};
