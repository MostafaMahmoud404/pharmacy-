const Review = require("../models/Review");
const Doctor = require("../models/Doctor");
const Product = require("../models/Product");
const Consultation = require("../models/Consultation");
const Order = require("../models/Order");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  getPaginationData,
} = require("../middleware/errorHandler");

// @desc    Create review for doctor
// @route   POST /api/reviews/doctor/:doctorId
// @access  Private/Customer
const createDoctorReview = asyncHandler(async (req, res, next) => {
  const { rating, comment, title, consultationId, detailedRatings } = req.body;
  const { doctorId } = req.params;

  // التحقق من الطبيب
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  // التحقق من الاستشارة
  if (consultationId) {
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new ErrorResponse("الاستشارة غير موجودة", 404));
    }

    if (consultation.patient.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("هذه الاستشارة لا تخصك", 403));
    }

    if (consultation.status !== "completed") {
      return next(new ErrorResponse("يجب إكمال الاستشارة قبل التقييم", 400));
    }

    // التحقق من عدم وجود مراجعة سابقة
    const existingReview = await Review.findOne({
      doctor: doctorId,
      reviewer: req.user._id,
      consultation: consultationId,
    });

    if (existingReview) {
      return next(new ErrorResponse("تم تقييم هذه الاستشارة بالفعل", 400));
    }
  }

  // إنشاء المراجعة
  const review = await Review.create({
    reviewType: "doctor",
    doctor: doctorId,
    consultation: consultationId,
    reviewer: req.user._id,
    rating,
    comment,
    title,
    detailedRatings,
    status: "approved", // يمكن تغييرها إلى pending للمراجعة
  });

  await review.populate("reviewer", "name profileImage");

  successResponse(res, 201, "تم إضافة التقييم بنجاح", { review });
});

// @desc    Create review for product
// @route   POST /api/reviews/product/:productId
// @access  Private/Customer
const createProductReview = asyncHandler(async (req, res, next) => {
  const { rating, comment, title, orderId } = req.body;
  const { productId } = req.params;

  // التحقق من المنتج
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  // التحقق من الطلب
  let verifiedPurchase = false;
  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("الطلب غير موجود", 404));
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("هذا الطلب لا يخصك", 403));
    }

    // التحقق من وجود المنتج في الطلب
    const hasProduct = order.items.some(
      (item) => item.product.toString() === productId
    );

    if (!hasProduct) {
      return next(new ErrorResponse("هذا المنتج غير موجود في الطلب", 400));
    }

    verifiedPurchase = order.status === "delivered";

    // التحقق من عدم وجود مراجعة سابقة
    const existingReview = await Review.findOne({
      product: productId,
      reviewer: req.user._id,
      order: orderId,
    });

    if (existingReview) {
      return next(
        new ErrorResponse("تم تقييم هذا المنتج في هذا الطلب بالفعل", 400)
      );
    }
  }

  // إنشاء المراجعة
  const review = await Review.create({
    reviewType: "product",
    product: productId,
    order: orderId,
    reviewer: req.user._id,
    rating,
    comment,
    title,
    verifiedPurchase,
    status: "approved",
  });

  await review.populate("reviewer", "name profileImage");

  successResponse(res, 201, "تم إضافة التقييم بنجاح", { review });
});

// @desc    Get reviews for doctor
// @route   GET /api/reviews/doctor/:doctorId
// @access  Public
const getDoctorReviews = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { sort = "-createdAt", page = 1, limit = 10 } = req.query;

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  const reviews = await Review.find({
    doctor: doctorId,
    status: "approved",
  })
    .populate("reviewer", "name profileImage")
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({
    doctor: doctorId,
    status: "approved",
  });

  // توزيع التقييمات
  const ratingDistribution = await Review.getRatingDistribution(
    doctorId,
    "doctor"
  );

  // أفضل المراجعات
  const topReviews = await Review.getTopReviews(doctorId, "doctor", 5);

  const pagination = getPaginationData(page, limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على التقييمات بنجاح",
    {
      reviews,
      ratingDistribution,
      topReviews,
    },
    pagination
  );
});

// @desc    Get reviews for product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { sort = "-createdAt", page = 1, limit = 10 } = req.query;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorResponse("المنتج غير موجود", 404));
  }

  const reviews = await Review.find({
    product: productId,
    status: "approved",
  })
    .populate("reviewer", "name profileImage")
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({
    product: productId,
    status: "approved",
  });

  const ratingDistribution = await Review.getRatingDistribution(
    productId,
    "product"
  );
  const topReviews = await Review.getTopReviews(productId, "product", 5);

  const pagination = getPaginationData(page, limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على التقييمات بنجاح",
    {
      reviews,
      ratingDistribution,
      topReviews,
    },
    pagination
  );
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res, next) => {
  const { rating, comment, title, detailedRatings } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  if (review.reviewer.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("غير مصرح لك بتعديل هذا التقييم", 403));
  }

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;
  if (title) review.title = title;
  if (detailedRatings) review.detailedRatings = detailedRatings;

  review.isEdited = true;
  review.editedAt = new Date();

  await review.save();

  successResponse(res, 200, "تم تحديث التقييم بنجاح", { review });
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  const isOwner = review.reviewer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return next(new ErrorResponse("غير مصرح لك بحذف هذا التقييم", 403));
  }

  await review.deleteOne();

  successResponse(res, 200, "تم حذف التقييم بنجاح");
});

// @desc    Vote on review (helpful/not helpful)
// @route   POST /api/reviews/:id/vote
// @access  Private
const voteReview = asyncHandler(async (req, res, next) => {
  const { isHelpful } = req.body;

  if (typeof isHelpful !== "boolean") {
    return next(new ErrorResponse("يجب تحديد نوع التصويت", 400));
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  await review.vote(req.user._id, isHelpful);

  successResponse(res, 200, "تم التصويت بنجاح", {
    helpfulCount: review.helpfulCount,
    notHelpfulCount: review.notHelpfulCount,
  });
});

// @desc    Add response to review (Doctor/Admin)
// @route   POST /api/reviews/:id/response
// @access  Private/Doctor/Admin
const addResponse = asyncHandler(async (req, res, next) => {
  const { message } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  // التحقق من الصلاحيات
  if (review.reviewType === "doctor") {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const isDoctor =
      doctor && doctor._id.toString() === review.doctor.toString();
    const isAdmin = req.user.role === "admin";

    if (!isDoctor && !isAdmin) {
      return next(new ErrorResponse("غير مصرح لك بالرد على هذا التقييم", 403));
    }
  } else {
    // للمنتجات، فقط Admin أو Pharmacist
    if (req.user.role !== "admin" && req.user.role !== "pharmacist") {
      return next(new ErrorResponse("غير مصرح لك بالرد على هذا التقييم", 403));
    }
  }

  await review.addResponse(req.user._id, message);

  successResponse(res, 200, "تم إضافة الرد بنجاح", { review });
});

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = asyncHandler(async (req, res, next) => {
  const { reason, description } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  if (review.reviewer.toString() === req.user._id.toString()) {
    return next(new ErrorResponse("لا يمكنك الإبلاغ عن تقييمك الخاص", 400));
  }

  await review.report(req.user._id, reason, description);

  successResponse(res, 200, "تم الإبلاغ عن التقييم بنجاح");
});

// @desc    Get pending reviews (Admin)
// @route   GET /api/reviews/pending
// @access  Private/Admin
const getPendingReviews = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const reviews = await Review.find({ status: "pending" })
    .populate("reviewer", "name profileImage")
    .populate("doctor", "user specialty")
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .populate("product", "name nameArabic")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({ status: "pending" });

  const pagination = getPaginationData(page, limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على التقييمات المعلقة بنجاح",
    { reviews },
    pagination
  );
});

// @desc    Approve review (Admin)
// @route   PUT /api/reviews/:id/approve
// @access  Private/Admin
const approveReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  review.status = "approved";
  await review.save();

  successResponse(res, 200, "تم الموافقة على التقييم بنجاح", { review });
});

// @desc    Reject review (Admin)
// @route   PUT /api/reviews/:id/reject
// @access  Private/Admin
const rejectReview = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("التقييم غير موجود", 404));
  }

  review.status = "rejected";
  review.rejectionReason = reason;
  await review.save();

  successResponse(res, 200, "تم رفض التقييم بنجاح", { review });
});

// @desc    Get my reviews
// @route   GET /api/reviews/my
// @access  Private
const getMyReviews = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const reviews = await Review.find({ reviewer: req.user._id })
    .populate("doctor", "user specialty")
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .populate("product", "name nameArabic images")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({ reviewer: req.user._id });

  const pagination = getPaginationData(page, limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على تقييماتك بنجاح",
    { reviews },
    pagination
  );
});

module.exports = {
  createDoctorReview,
  createProductReview,
  getDoctorReviews,
  getProductReviews,
  updateReview,
  deleteReview,
  voteReview,
  addResponse,
  reportReview,
  getPendingReviews,
  approveReview,
  rejectReview,
  getMyReviews,
};
