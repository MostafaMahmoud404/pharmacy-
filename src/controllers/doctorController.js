const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Consultation = require("../models/Consultation");
const Review = require("../models/Review");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");

// @desc    Create doctor profile
// @route   POST /api/doctors/profile
// @access  Private/Doctor
const createDoctorProfile = asyncHandler(async (req, res, next) => {
  const {
    specialty,
    specialtyArabic,
    licenseNumber,
    qualifications,
    experience,
    bio,
    consultationFee,
    consultationTypes,
    languages,
  } = req.body;

  // التحقق من عدم وجود ملف طبيب مسبقاً
  const existingProfile = await Doctor.findOne({ user: req.user._id });
  if (existingProfile) {
    return next(new ErrorResponse("لديك ملف طبيب بالفعل", 400));
  }

  // التحقق من رقم الترخيص
  const licenseExists = await Doctor.findOne({ licenseNumber });
  if (licenseExists) {
    return next(new ErrorResponse("رقم الترخيص مستخدم بالفعل", 400));
  }

  // إنشاء ملف الطبيب
  const doctor = await Doctor.create({
    user: req.user._id,
    specialty,
    specialtyArabic,
    licenseNumber,
    qualifications,
    experience,
    bio,
    consultationFee,
    consultationTypes,
    languages,
  });

  successResponse(
    res,
    201,
    "تم إنشاء ملف الطبيب بنجاح. في انتظار موافقة الإدارة",
    {
      doctor,
    }
  );
});

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
const getDoctors = asyncHandler(async (req, res, next) => {
  // فقط الأطباء المفعلين والمتاحين
  const baseQuery = { isVerified: true, isAvailable: true };

  const features = new APIFeatures(
    Doctor.find(baseQuery).populate("user", "name profileImage"),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const doctors = await features.query;
  const total = await Doctor.countDocuments({
    ...baseQuery,
    ...features.query.getFilter(),
  });

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الأطباء بنجاح",
    { doctors },
    pagination
  );
});

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id).populate(
    "user",
    "name email phone profileImage"
  );

  if (!doctor) {
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  // الحصول على المراجعات
  const reviews = await Review.find({
    doctor: doctor._id,
    status: "approved",
  })
    .populate("reviewer", "name profileImage")
    .sort("-createdAt")
    .limit(10);

  // الحصول على توزيع التقييمات
  const ratingDistribution = await Review.getRatingDistribution(
    doctor._id,
    "doctor"
  );

  successResponse(res, 200, "تم الحصول على الطبيب بنجاح", {
    doctor,
    reviews,
    ratingDistribution,
  });
});

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private/Doctor
const updateDoctorProfile = asyncHandler(async (req, res, next) => {
  const {
    specialtyArabic,
    qualifications,
    experience,
    bio,
    consultationFee,
    consultationTypes,
    languages,
    availableTimes,
  } = req.body;

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  // تحديث الحقول المسموح بها
  if (specialtyArabic) doctor.specialtyArabic = specialtyArabic;
  if (qualifications) doctor.qualifications = qualifications;
  if (experience !== undefined) doctor.experience = experience;
  if (bio) doctor.bio = bio;
  if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
  if (consultationTypes) doctor.consultationTypes = consultationTypes;
  if (languages) doctor.languages = languages;
  if (availableTimes) doctor.availableTimes = availableTimes;

  await doctor.save();

  successResponse(res, 200, "تم تحديث الملف بنجاح", { doctor });
});

// @desc    Get doctor's own profile
// @route   GET /api/doctors/me
// @access  Private/Doctor
const getMyProfile = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).populate(
    "user",
    "name email phone profileImage"
  );

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  // إحصائيات الطبيب
  const totalConsultations = await Consultation.countDocuments({
    doctor: doctor._id,
  });
  const completedConsultations = await Consultation.countDocuments({
    doctor: doctor._id,
    status: "completed",
  });
  const upcomingConsultations = await Consultation.countDocuments({
    doctor: doctor._id,
    status: { $in: ["pending", "confirmed"] },
    scheduledTime: { $gte: new Date() },
  });

  const stats = {
    totalConsultations,
    completedConsultations,
    upcomingConsultations,
    rating: doctor.rating,
  };

  successResponse(res, 200, "تم الحصول على الملف بنجاح", {
    doctor,
    stats,
  });
});

// @desc    Toggle doctor availability
// @route   PUT /api/doctors/availability
// @access  Private/Doctor
const toggleAvailability = asyncHandler(async (req, res, next) => {
  const { isAvailable } = req.body;

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  doctor.isAvailable = isAvailable;
  await doctor.save();

  successResponse(res, 200, "تم تحديث حالة التوفر بنجاح", {
    isAvailable: doctor.isAvailable,
  });
});

// @desc    Update available times
// @route   PUT /api/doctors/available-times
// @access  Private/Doctor
const updateAvailableTimes = asyncHandler(async (req, res, next) => {
  const { availableTimes } = req.body;

  if (!availableTimes || !Array.isArray(availableTimes)) {
    return next(new ErrorResponse("بيانات المواعيد غير صحيحة", 400));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  doctor.availableTimes = availableTimes;
  await doctor.save();

  successResponse(res, 200, "تم تحديث المواعيد بنجاح", {
    availableTimes: doctor.availableTimes,
  });
});

// @desc    Get doctor's consultations
// @route   GET /api/doctors/consultations
// @access  Private/Doctor
const getDoctorConsultations = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  const { status, startDate, endDate } = req.query;

  let query = { doctor: doctor._id };

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.scheduledTime = {};
    if (startDate) query.scheduledTime.$gte = new Date(startDate);
    if (endDate) query.scheduledTime.$lte = new Date(endDate);
  }

  const features = new APIFeatures(
    Consultation.find(query).populate("patient", "name phone profileImage"),
    req.query
  )
    .sort()
    .paginate();

  const consultations = await features.query;
  const total = await Consultation.countDocuments(query);

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الاستشارات بنجاح",
    { consultations },
    pagination
  );
});

// @desc    Get upcoming consultations
// @route   GET /api/doctors/consultations/upcoming
// @access  Private/Doctor
const getUpcomingConsultations = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  const consultations = await Consultation.getUpcomingConsultations(
    doctor._id,
    24
  );

  successResponse(res, 200, "تم الحصول على الاستشارات القادمة بنجاح", {
    consultations,
    count: consultations.length,
  });
});

// @desc    Verify doctor (Admin only)
// @route   PUT /api/doctors/:id/verify
// @access  Private/Admin
const verifyDoctor = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  doctor.isVerified = true;
  await doctor.save();

  // إرسال إيميل للطبيب بالتفعيل
  // await sendVerificationEmail(doctor);

  successResponse(res, 200, "تم تفعيل حساب الطبيب بنجاح", { doctor });
});

// @desc    Reject doctor verification (Admin only)
// @route   PUT /api/doctors/:id/reject
// @access  Private/Admin
const rejectDoctor = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  doctor.isVerified = false;
  await doctor.save();

  // إرسال إيميل للطبيب بالرفض مع السبب
  // await sendRejectionEmail(doctor, reason);

  successResponse(res, 200, "تم رفض حساب الطبيب", { doctor });
});

// @desc    Search doctors
// @route   GET /api/doctors/search
// @access  Public
const searchDoctors = asyncHandler(async (req, res, next) => {
  const { q, specialty, minRating, maxFee, consultationType } = req.query;

  let query = { isVerified: true, isAvailable: true };

  // البحث بالاسم
  if (q && q.length >= 2) {
    const users = await User.find({
      role: "doctor",
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).select("_id");

    const userIds = users.map((user) => user._id);
    query.user = { $in: userIds };
  }

  // التخصص
  if (specialty) {
    query.specialty = specialty;
  }

  // التقييم
  if (minRating) {
    query["rating.average"] = { $gte: parseFloat(minRating) };
  }

  // السعر
  if (maxFee) {
    query.consultationFee = { $lte: parseFloat(maxFee) };
  }

  // نوع الاستشارة
  if (consultationType) {
    query.consultationTypes = consultationType;
  }

  const doctors = await Doctor.find(query)
    .populate("user", "name profileImage")
    .sort("-rating.average")
    .limit(20);

  successResponse(res, 200, "نتائج البحث", {
    doctors,
    count: doctors.length,
  });
});

// @desc    Get doctor statistics (Admin)
// @route   GET /api/doctors/stats
// @access  Private/Admin
const getDoctorStats = asyncHandler(async (req, res, next) => {
  const totalDoctors = await Doctor.countDocuments();
  const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
  const availableDoctors = await Doctor.countDocuments({
    isVerified: true,
    isAvailable: true,
  });
  const pendingVerification = await Doctor.countDocuments({
    isVerified: false,
  });

  // أفضل الأطباء
  const topRatedDoctors = await Doctor.find({ isVerified: true })
    .populate("user", "name profileImage")
    .sort("-rating.average")
    .limit(10)
    .select(
      "specialty specialtyArabic rating consultationFee totalConsultations"
    );

  // التوزيع حسب التخصص
  const specialtyDistribution = await Doctor.aggregate([
    { $match: { isVerified: true } },
    {
      $group: {
        _id: "$specialty",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const stats = {
    total: totalDoctors,
    verified: verifiedDoctors,
    available: availableDoctors,
    pendingVerification,
    topRatedDoctors,
    specialtyDistribution,
  };

  successResponse(res, 200, "تم الحصول على الإحصائيات بنجاح", { stats });
});

// @desc    Get doctors by specialty
// @route   GET /api/doctors/specialty/:specialty
// @access  Public
const getDoctorsBySpecialty = asyncHandler(async (req, res, next) => {
  const { specialty } = req.params;

  const doctors = await Doctor.find({
    specialty,
    isVerified: true,
    isAvailable: true,
  })
    .populate("user", "name profileImage")
    .sort("-rating.average");

  successResponse(res, 200, `أطباء تخصص ${specialty}`, {
    doctors,
    count: doctors.length,
  });
});

// @desc    Upload verification documents (Doctor)
// @route   POST /api/doctors/verification-documents
// @access  Private/Doctor
const uploadVerificationDocuments = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ErrorResponse("يرجى رفع المستندات", 400));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  // إضافة المستندات
  req.files.forEach((file) => {
    doctor.verificationDocuments.push({
      type: req.body.documentType || "certificate",
      url: file.path,
      uploadedAt: new Date(),
    });
  });

  await doctor.save();

  successResponse(res, 200, "تم رفع المستندات بنجاح", {
    documents: doctor.verificationDocuments,
  });
});

module.exports = {
  createDoctorProfile,
  getDoctors,
  getDoctorById,
  updateDoctorProfile,
  getMyProfile,
  toggleAvailability,
  updateAvailableTimes,
  getDoctorConsultations,
  getUpcomingConsultations,
  verifyDoctor,
  rejectDoctor,
  searchDoctors,
  getDoctorStats,
  getDoctorsBySpecialty,
  uploadVerificationDocuments,
};
