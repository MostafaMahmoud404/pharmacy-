const Product = require("../models/Product");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");
const { deleteFile } = require("../middleware/upload");

// ✅ Helper: Parse array fields correctly
const parseArrayField = (fieldData) => {
  if (!fieldData) return [];
  if (Array.isArray(fieldData)) {
    return fieldData.filter((item) => item && item.trim() !== "");
  }
  if (typeof fieldData === "string") {
    const trimmed = fieldData.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && item.trim() !== "");
      }
      return [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [];
};

// ✅ Helper: Parse boolean fields
const parseBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  return value === "true" || value === true;
};

// ✅ Helper: Validate required fields
const validateProductData = (data) => {
  const errors = [];

  if (!data.name?.trim()) errors.push("اسم المنتج مطلوب");
  if (!data.sku?.trim()) errors.push("رمز المنتج (SKU) مطلوب");
  if (!data.category?.trim()) errors.push("التصنيف مطلوب");

  if (data.price !== undefined && (isNaN(data.price) || data.price < 0)) {
    errors.push("السعر يجب أن يكون رقم موجب");
  }

  if (data.stock !== undefined && (isNaN(data.stock) || data.stock < 0)) {
    errors.push("الكمية يجب أن تكون رقم موجب");
  }

  return errors;
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin/Pharmacist
const createProduct = asyncHandler(async (req, res, next) => {
  try {
    console.log("📦 Creating product...");

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
      usageInstructions,
      storageConditions,
      expiryDate,
      barcode,
      sku,
      isActive,
      isFeatured,
    } = req.body;

    // Parse arrays
    const activeIngredients = parseArrayField(
      req.body["activeIngredients[]"] || req.body.activeIngredients
    );
    const sideEffects = parseArrayField(
      req.body["sideEffects[]"] || req.body.sideEffects
    );
    const contraindications = parseArrayField(
      req.body["contraindications[]"] || req.body.contraindications
    );
    const warnings = parseArrayField(
      req.body["warnings[]"] || req.body.warnings
    );
    const tags = parseArrayField(req.body["tags[]"] || req.body.tags);

    // Validate
    const errors = validateProductData({ name, sku, category, price, stock });
    if (errors.length > 0) {
      return next(new ErrorResponse(errors.join(", "), 400));
    }

    // Check SKU
    const skuExists = await Product.findOne({ sku: sku.trim() });
    if (skuExists) {
      return next(new ErrorResponse("رمز المنتج (SKU) مستخدم بالفعل", 400));
    }

    // Check Barcode
    if (barcode) {
      const barcodeExists = await Product.findOne({ barcode: barcode.trim() });
      if (barcodeExists) {
        return next(new ErrorResponse("الباركود مستخدم بالفعل", 400));
      }
    }

    // Process images
    let images = [];
    if (req.files?.length > 0) {
      images = req.files.map((file, index) => ({
        url: file.path,
        publicId: file.filename,
        isMain: index === 0,
      }));
    }

    // Create product
    const productData = {
      name: name.trim(),
      nameArabic: nameArabic?.trim(),
      description: description?.trim(),
      scientificName: scientificName?.trim(),
      category: category.trim(),
      categoryArabic: categoryArabic?.trim(),
      subCategory: subCategory?.trim(),
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
      images,
      manufacturer: manufacturer?.trim(),
      requiresPrescription: parseBoolean(requiresPrescription) || false,
      dosageForm: dosageForm?.trim(),
      strength: strength?.trim(),
      packSize: packSize?.trim(),
      usageInstructions: usageInstructions?.trim(),
      storageConditions: storageConditions?.trim(),
      barcode: barcode?.trim(),
      sku: sku.trim(),
      isActive: parseBoolean(isActive) ?? true,
      isFeatured: parseBoolean(isFeatured) || false,
      metadata: {
        createdBy: req.user._id,
      },
    };

    // Add optional fields only if they have values
    if (discountPrice) productData.discountPrice = parseFloat(discountPrice);
    if (expiryDate) productData.expiryDate = expiryDate;
    if (activeIngredients.length > 0)
      productData.activeIngredients = activeIngredients;
    if (sideEffects.length > 0) productData.sideEffects = sideEffects;
    if (contraindications.length > 0)
      productData.contraindications = contraindications;
    if (warnings.length > 0) productData.warnings = warnings;
    if (tags.length > 0) productData.tags = tags;

    const product = await Product.create(productData);

    console.log("✅ Product created:", product._id);

    successResponse(res, 201, "تم إضافة المنتج بنجاح", { product });
  } catch (error) {
    console.error("❌ Create product error:", error);

    // Delete uploaded files if product creation failed
    if (req.files?.length > 0) {
      req.files.forEach((file) => deleteFile(file.path));
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return next(new ErrorResponse(messages.join(", "), 400));
    }

    return next(new ErrorResponse(error.message || "فشل إنشاء المنتج", 500));
  }
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

  await product.incrementViews();

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
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse("المنتج غير موجود", 404));
    }

    console.log("📝 Updating product:", product._id);

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
      usageInstructions,
      storageConditions,
      expiryDate,
      barcode,
      isActive,
      isFeatured,
    } = req.body;

    // Parse arrays
    const activeIngredients = parseArrayField(
      req.body["activeIngredients[]"] || req.body.activeIngredients
    );
    const sideEffects = parseArrayField(
      req.body["sideEffects[]"] || req.body.sideEffects
    );
    const contraindications = parseArrayField(
      req.body["contraindications[]"] || req.body.contraindications
    );
    const warnings = parseArrayField(
      req.body["warnings[]"] || req.body.warnings
    );
    const tags = parseArrayField(req.body["tags[]"] || req.body.tags);

    // Check Barcode
    if (barcode && barcode !== product.barcode) {
      const barcodeExists = await Product.findOne({
        barcode: barcode.trim(),
        _id: { $ne: product._id },
      });
      if (barcodeExists) {
        return next(new ErrorResponse("الباركود مستخدم بالفعل", 400));
      }
    }

    // Update fields
    if (name) product.name = name.trim();
    if (nameArabic) product.nameArabic = nameArabic.trim();
    if (description !== undefined) product.description = description?.trim();
    if (scientificName) product.scientificName = scientificName.trim();
    if (category) product.category = category.trim();
    if (categoryArabic) product.categoryArabic = categoryArabic.trim();
    if (subCategory) product.subCategory = subCategory.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (discountPrice !== undefined) {
      product.discountPrice = discountPrice
        ? parseFloat(discountPrice)
        : undefined;
    }
    if (stock !== undefined) product.stock = parseInt(stock);
    if (manufacturer) product.manufacturer = manufacturer.trim();
    if (requiresPrescription !== undefined) {
      product.requiresPrescription = parseBoolean(requiresPrescription);
    }
    if (dosageForm) product.dosageForm = dosageForm.trim();
    if (strength) product.strength = strength.trim();
    if (packSize) product.packSize = packSize.trim();
    if (usageInstructions) product.usageInstructions = usageInstructions.trim();
    if (storageConditions) product.storageConditions = storageConditions.trim();
    if (expiryDate) product.expiryDate = expiryDate;
    if (barcode) product.barcode = barcode.trim();
    if (isActive !== undefined) product.isActive = parseBoolean(isActive);
    if (isFeatured !== undefined) product.isFeatured = parseBoolean(isFeatured);

    // Update arrays
    if (activeIngredients.length > 0)
      product.activeIngredients = activeIngredients;
    if (sideEffects.length > 0) product.sideEffects = sideEffects;
    if (contraindications.length > 0)
      product.contraindications = contraindications;
    if (warnings.length > 0) product.warnings = warnings;
    if (tags.length > 0) product.tags = tags;

    product.metadata.lastUpdatedBy = req.user._id;

    await product.save();

    console.log("✅ Product updated:", product._id);

    successResponse(res, 200, "تم تحديث المنتج بنجاح", { product });
  } catch (error) {
    console.error("❌ Update product error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return next(new ErrorResponse(messages.join(", "), 400));
    }

    return next(new ErrorResponse(error.message || "فشل تحديث المنتج", 500));
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access Private/Admin/Pharmacist

const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  if (product.images?.length > 0) {
    product.images.forEach((image) => deleteFile(image.url));
  }

  await product.deleteOne();

  successResponse(res, 200, "تم حذف المنتج بنجاح");
});

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private/Admin/Pharmacist
const uploadProductImages = asyncHandler(async (req, res, next) => {
  if (!req.files?.length) {
    return next(new ErrorResponse("يرجى اختيار صور", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  req.files.forEach((file, index) => {
    product.images.push({
      url: file.path,
      publicId: file.filename,
      isMain: product.images.length === 0 && index === 0,
    });
  });

  await product.save();

  successResponse(res, 200, "تم رفع الصور بنجاح", { images: product.images });
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

  deleteFile(image.url);
  image.deleteOne();

  if (image.isMain && product.images.length > 0) {
    product.images[0].isMain = true;
  }

  await product.save();

  successResponse(res, 200, "تم حذف الصورة بنجاح", { images: product.images });
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

  successResponse(res, 200, "تم تحديث المخزون بنجاح", { stock: product.stock });
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

  if (category) query.category = category;
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

// @desc    Get low stock products
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

// @desc    Get product statistics
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
