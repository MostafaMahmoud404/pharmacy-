const Pharmacy = require("../models/Pharmacy");
const User = require("../models/User");
const Product = require("../models/Product");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
} = require("../middleware/errorHandler");

// @desc    Get all pharmacies
// @route   GET /api/pharmacies
// @access  Public
const getPharmacies = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    city,
    state,
    isVerified,
    isAvailable,
    search,
    minRating,
    sort = "-createdAt",
  } = req.query;

  const query = {};

  // Filters
  if (city) query["address.city"] = new RegExp(city, "i");
  if (state) query["address.state"] = new RegExp(state, "i");
  if (isVerified !== undefined) query.isVerified = isVerified === "true";
  if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
  if (minRating) query.rating = { $gte: parseFloat(minRating) };

  // Search by pharmacy name
  if (search) {
    query.$or = [
      { pharmacyName: new RegExp(search, "i") },
      { pharmacyNameArabic: new RegExp(search, "i") },
    ];
  }

  const skip = (page - 1) * limit;

  const pharmacies = await Pharmacy.find(query)
    .populate("user", "name email phone profileImage")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Pharmacy.countDocuments(query);

  successResponse(res, 200, "تم الحصول على الصيدليات بنجاح", {
    pharmacies,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
    },
  });
});

// @desc    Get single pharmacy
// @route   GET /api/pharmacies/:id
// @access  Public
const getPharmacyById = asyncHandler(async (req, res, next) => {
  const pharmacy = await Pharmacy.findById(req.params.id)
    .populate("user", "name email phone profileImage")
    .populate({
      path: "products",
      select: "name nameArabic price images rating stock category",
      match: { isActive: true },
      options: { limit: 10, sort: "-createdAt" },
    });

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  successResponse(res, 200, "تم الحصول على بيانات الصيدلية بنجاح", {
    pharmacy,
  });
});

// @desc    Get pharmacy profile (for logged-in pharmacist)
// @route   GET /api/pharmacies/me
// @access  Private/Pharmacist
const getMyPharmacy = asyncHandler(async (req, res, next) => {
  const pharmacy = await Pharmacy.findOne({ user: req.user._id }).populate(
    "user",
    "name email phone profileImage"
  );

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  successResponse(res, 200, "تم الحصول على بيانات الصيدلية بنجاح", {
    pharmacy,
  });
});

// @desc    Update pharmacy profile
// @route   PUT /api/pharmacies/me
// @access  Private/Pharmacist
const updateMyPharmacy = asyncHandler(async (req, res, next) => {
  const {
    pharmacyName,
    pharmacyNameArabic,
    description,
    street,
    city,
    state,
    zipCode,
    workingHours,
    deliveryEnabled,
    deliveryFee,
    freeDeliveryThreshold,
    acceptsInsurance,
    insuranceProviders,
  } = req.body;

  const pharmacy = await Pharmacy.findOne({ user: req.user._id });

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  // Update basic info
  if (pharmacyName) pharmacy.pharmacyName = pharmacyName;
  if (pharmacyNameArabic) pharmacy.pharmacyNameArabic = pharmacyNameArabic;
  if (description) pharmacy.description = description;

  // Update address
  if (street || city || state || zipCode) {
    pharmacy.address = {
      street: street || pharmacy.address.street,
      city: city || pharmacy.address.city,
      state: state || pharmacy.address.state,
      zipCode: zipCode || pharmacy.address.zipCode,
      coordinates: pharmacy.address.coordinates,
    };
  }

  // Update working hours
  if (workingHours) pharmacy.workingHours = workingHours;

  // Update delivery settings
  if (deliveryEnabled !== undefined) pharmacy.deliveryEnabled = deliveryEnabled;
  if (deliveryFee !== undefined) pharmacy.deliveryFee = deliveryFee;
  if (freeDeliveryThreshold !== undefined)
    pharmacy.freeDeliveryThreshold = freeDeliveryThreshold;

  // Update insurance
  if (acceptsInsurance !== undefined)
    pharmacy.acceptsInsurance = acceptsInsurance;
  if (insuranceProviders) pharmacy.insuranceProviders = insuranceProviders;

  await pharmacy.save();

  successResponse(res, 200, "تم تحديث بيانات الصيدلية بنجاح", { pharmacy });
});

// @desc    Upload pharmacy image
// @route   PUT /api/pharmacies/me/image
// @access  Private/Pharmacist
const uploadPharmacyImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("يرجى رفع صورة", 400));
  }

  const pharmacy = await Pharmacy.findOne({ user: req.user._id });

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  // Delete old image if exists
  if (
    pharmacy.pharmacyImage &&
    pharmacy.pharmacyImage !== "default-pharmacy.png"
  ) {
    const fs = require("fs");
    const oldImagePath = `./${pharmacy.pharmacyImage}`;
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  pharmacy.pharmacyImage = req.file.path;
  await pharmacy.save();

  successResponse(res, 200, "تم رفع صورة الصيدلية بنجاح", {
    pharmacyImage: pharmacy.pharmacyImage,
  });
});

// @desc    Toggle pharmacy availability
// @route   PUT /api/pharmacies/me/availability
// @access  Private/Pharmacist
const toggleAvailability = asyncHandler(async (req, res, next) => {
  const pharmacy = await Pharmacy.findOne({ user: req.user._id });

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  pharmacy.isAvailable = !pharmacy.isAvailable;
  await pharmacy.save();

  successResponse(
    res,
    200,
    `الصيدلية الآن ${pharmacy.isAvailable ? "متاحة" : "غير متاحة"}`,
    {
      isAvailable: pharmacy.isAvailable,
    }
  );
});

// @desc    Get pharmacy products
// @route   GET /api/pharmacies/:id/products
// @access  Public
const getPharmacyProducts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, category, search, minPrice, maxPrice } = req.query;

  const query = {
    pharmacy: req.params.id,
    isActive: true,
  };

  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { nameArabic: new RegExp(search, "i") },
    ];
  }
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort("-createdAt")
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(query);

  successResponse(res, 200, "تم الحصول على المنتجات بنجاح", {
    products,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
    },
  });
});

// @desc    Get pharmacy statistics
// @route   GET /api/pharmacies/me/stats
// @access  Private/Pharmacist
const getPharmacyStats = asyncHandler(async (req, res, next) => {
  const pharmacy = await Pharmacy.findOne({ user: req.user._id });

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  const totalProducts = await Product.countDocuments({ pharmacy: pharmacy._id });
  const activeProducts = await Product.countDocuments({
    pharmacy: pharmacy._id,
    isActive: true,
  });

  successResponse(res, 200, "تم الحصول على الإحصائيات بنجاح", {
    stats: {
      ...pharmacy.stats,
      totalProducts,
      activeProducts,
      rating: pharmacy.rating,
      totalReviews: pharmacy.totalReviews,
      isVerified: pharmacy.isVerified,
    },
  });
});

// ===== ADMIN ROUTES =====

// @desc    Verify pharmacy
// @route   PUT /api/pharmacies/:id/verify
// @access  Private/Admin
const verifyPharmacy = asyncHandler(async (req, res, next) => {
  const pharmacy = await Pharmacy.findById(req.params.id);

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  pharmacy.isVerified = true;
  pharmacy.verifiedAt = Date.now();
  pharmacy.verifiedBy = req.user._id;

  await pharmacy.save();

  successResponse(res, 200, "تم التحقق من الصيدلية بنجاح", { pharmacy });
});

// @desc    Delete pharmacy
// @route   DELETE /api/pharmacies/:id
// @access  Private/Admin
const deletePharmacy = asyncHandler(async (req, res, next) => {
  const pharmacy = await Pharmacy.findById(req.params.id);

  if (!pharmacy) {
    return next(new ErrorResponse("الصيدلية غير موجودة", 404));
  }

  // Delete associated user
  await User.findByIdAndDelete(pharmacy.user);

  // Delete pharmacy
  await pharmacy.deleteOne();

  successResponse(res, 200, "تم حذف الصيدلية بنجاح");
});

module.exports = {
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
};