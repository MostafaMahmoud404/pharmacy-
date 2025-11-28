const Consultation = require("../models/Consultation");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");

// @desc    Book consultation
// @route   POST /api/consultations
// @access  Private/Customer
const bookConsultation = asyncHandler(async (req, res, next) => {
  const {
    doctorId,
    type,
    scheduledTime,
    chiefComplaint,
    symptoms,
    medicalHistory,
  } = req.body;

  // التحقق من الطبيب
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  if (!doctor.isVerified || !doctor.isAvailable) {
    return next(new ErrorResponse("الطبيب غير متاح حالياً", 400));
  }

  // التحقق من نوع الاستشارة
  if (!doctor.consultationTypes.includes(type)) {
    return next(
      new ErrorResponse("الطبيب لا يقدم هذا النوع من الاستشارات", 400)
    );
  }

  // التحقق من الموعد
  const scheduledDate = new Date(scheduledTime);
  if (scheduledDate <= new Date()) {
    return next(new ErrorResponse("يجب أن يكون الموعد في المستقبل", 400));
  }

  // التحقق من توفر الطبيب في هذا الموعد
  const existingConsultation = await Consultation.findOne({
    doctor: doctorId,
    scheduledTime: {
      $gte: new Date(scheduledDate.getTime() - 30 * 60000), // 30 دقيقة قبل
      $lt: new Date(scheduledDate.getTime() + 30 * 60000), // 30 دقيقة بعد
    },
    status: { $in: ["pending", "confirmed", "in-progress"] },
  });

  if (existingConsultation) {
    return next(
      new ErrorResponse("الطبيب لديه استشارة أخرى في هذا الوقت", 400)
    );
  }

  // إنشاء الاستشارة
  const consultation = await Consultation.create({
    doctor: doctorId,
    patient: req.user._id,
    type,
    scheduledTime,
    chiefComplaint,
    symptoms,
    medicalHistory,
    payment: {
      amount: doctor.consultationFee,
      status: "pending",
    },
  });

  await consultation.populate([
    { path: "doctor", populate: { path: "user", select: "name profileImage" } },
    { path: "patient", select: "name phone" },
  ]);

  successResponse(res, 201, "تم حجز الاستشارة بنجاح", { consultation });
});

// @desc    Get consultation by ID
// @route   GET /api/consultations/:id
// @access  Private
const getConsultationById = asyncHandler(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id).populate([
    {
      path: "doctor",
      populate: { path: "user", select: "name phone profileImage" },
    },
    { path: "patient", select: "name phone profileImage" },
    { path: "prescription" },
  ]);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  // التحقق من الصلاحيات
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === consultation.doctor._id.toString();
  const isPatient =
    consultation.patient._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isDoctor && !isPatient && !isAdmin) {
    return next(new ErrorResponse("غير مصرح لك بالوصول لهذه الاستشارة", 403));
  }

  successResponse(res, 200, "تم الحصول على الاستشارة بنجاح", {
    consultation,
    userRole: isDoctor ? "doctor" : "patient",
  });
});

// @desc    Get my consultations (Patient)
// @route   GET /api/consultations/my
// @access  Private/Customer
const getMyConsultations = asyncHandler(async (req, res, next) => {
  const { status } = req.query;

  let query = { patient: req.user._id };
  if (status) {
    query.status = status;
  }

  const features = new APIFeatures(
    Consultation.find(query)
      .populate("doctor", "user specialty specialtyArabic rating")
      .populate({
        path: "doctor",
        populate: { path: "user", select: "name profileImage" },
      }),
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

// @desc    Get doctor consultations
// @route   GET /api/consultations/doctor/my
// @access  Private/Doctor
const getDoctorConsultations = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) {
    return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
  }

  const { status, date } = req.query;

  let query = { doctor: doctor._id };

  if (status) {
    query.status = status;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query.scheduledTime = { $gte: startOfDay, $lte: endOfDay };
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

// @desc    Confirm consultation payment
// @route   POST /api/consultations/:id/confirm-payment
// @access  Private/Customer
const confirmPayment = asyncHandler(async (req, res, next) => {
  const { paymentMethod, transactionId } = req.body;

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  if (consultation.patient.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
  }

  if (consultation.payment.status === "paid") {
    return next(new ErrorResponse("تم الدفع بالفعل", 400));
  }

  consultation.payment.status = "paid";
  consultation.payment.method = paymentMethod;
  consultation.payment.transactionId = transactionId;
  consultation.payment.paidAt = new Date();
  consultation.status = "confirmed";

  await consultation.save();

  successResponse(res, 200, "تم تأكيد الدفع بنجاح", { consultation });
});

// @desc    Start consultation
// @route   POST /api/consultations/:id/start
// @access  Private/Doctor
const startConsultation = asyncHandler(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor || doctor._id.toString() !== consultation.doctor.toString()) {
    return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
  }

  await consultation.start();

  successResponse(res, 200, "تم بدء الاستشارة بنجاح", { consultation });
});

// @desc    Complete consultation
// @route   POST /api/consultations/:id/complete
// @access  Private/Doctor
const completeConsultation = asyncHandler(async (req, res, next) => {
  const { doctorNotes, diagnosis } = req.body;

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor || doctor._id.toString() !== consultation.doctor.toString()) {
    return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
  }

  await consultation.complete(doctorNotes, diagnosis);

  successResponse(res, 200, "تم إنهاء الاستشارة بنجاح", { consultation });
});

// @desc    Cancel consultation
// @route   POST /api/consultations/:id/cancel
// @access  Private
const cancelConsultation = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  // التحقق من الصلاحيات
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === consultation.doctor.toString();
  const isPatient = consultation.patient.toString() === req.user._id.toString();

  if (!isDoctor && !isPatient) {
    return next(new ErrorResponse("غير مصرح لك بإلغاء هذه الاستشارة", 403));
  }

  const cancelledBy = isDoctor ? "doctor" : "patient";
  await consultation.cancel(cancelledBy, reason);

  successResponse(res, 200, "تم إلغاء الاستشارة بنجاح", { consultation });
});

// @desc    Add message to consultation chat
// @route   POST /api/consultations/:id/messages
// @access  Private
const addMessage = asyncHandler(async (req, res, next) => {
  const { message, attachments } = req.body;

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  // التحقق من المشاركة في الاستشارة
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === consultation.doctor.toString();
  const isPatient = consultation.patient.toString() === req.user._id.toString();

  if (!isDoctor && !isPatient) {
    return next(
      new ErrorResponse("غير مصرح لك بإرسال رسائل في هذه الاستشارة", 403)
    );
  }

  const senderType = isDoctor ? "doctor" : "patient";
  const newMessage = await consultation.addMessage(
    req.user._id,
    senderType,
    message,
    attachments
  );

  // هنا يمكن إضافة Socket.io لإرسال الرسالة في الوقت الفعلي

  successResponse(res, 201, "تم إرسال الرسالة بنجاح", { message: newMessage });
});

// @desc    Get consultation messages
// @route   GET /api/consultations/:id/messages
// @access  Private
const getMessages = asyncHandler(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id).populate(
    "chatMessages.sender",
    "name profileImage"
  );

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  // التحقق من المشاركة
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === consultation.doctor.toString();
  const isPatient = consultation.patient.toString() === req.user._id.toString();

  if (!isDoctor && !isPatient) {
    return next(
      new ErrorResponse("غير مصرح لك بالوصول لرسائل هذه الاستشارة", 403)
    );
  }

  // وضع علامة قراءة على الرسائل
  const userType = isDoctor ? "doctor" : "patient";
  await consultation.markMessagesAsRead(userType);

  successResponse(res, 200, "تم الحصول على الرسائل بنجاح", {
    messages: consultation.chatMessages,
  });
});

// @desc    Rate consultation
// @route   POST /api/consultations/:id/rate
// @access  Private/Customer
const rateConsultation = asyncHandler(async (req, res, next) => {
  const { score, comment } = req.body;

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  if (consultation.patient.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("غير مصرح لك بتقييم هذه الاستشارة", 403));
  }

  if (consultation.status !== "completed") {
    return next(new ErrorResponse("يجب إكمال الاستشارة قبل التقييم", 400));
  }

  if (consultation.rating?.score) {
    return next(new ErrorResponse("تم تقييم الاستشارة بالفعل", 400));
  }

  consultation.rating = {
    score,
    comment,
    ratedAt: new Date(),
  };

  await consultation.save();

  // تحديث تقييم الطبيب
  const doctor = await Doctor.findById(consultation.doctor);
  await doctor.calculateRating();

  successResponse(res, 200, "تم تقييم الاستشارة بنجاح", { consultation });
});

// @desc    Get upcoming consultations
// @route   GET /api/consultations/upcoming
// @access  Private
const getUpcomingConsultations = asyncHandler(async (req, res, next) => {
  const { hours = 24 } = req.query;

  let query = {};

  if (req.user.role === "customer") {
    query.patient = req.user._id;
  } else if (req.user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return next(new ErrorResponse("ملف الطبيب غير موجود", 404));
    }
    query.doctor = doctor._id;
  }

  const now = new Date();
  const futureTime = new Date(now.getTime() + parseInt(hours) * 60 * 60 * 1000);

  query.scheduledTime = { $gte: now, $lte: futureTime };
  query.status = { $in: ["confirmed", "pending"] };

  const consultations = await Consultation.find(query)
    .populate("doctor", "user specialty specialtyArabic")
    .populate({
      path: "doctor",
      populate: { path: "user", select: "name profileImage" },
    })
    .populate("patient", "name phone profileImage")
    .sort("scheduledTime");

  successResponse(res, 200, "تم الحصول على الاستشارات القادمة بنجاح", {
    consultations,
    count: consultations.length,
  });
});

// @desc    Get consultation statistics (Admin)
// @route   GET /api/consultations/stats
// @access  Private/Admin
const getConsultationStats = asyncHandler(async (req, res, next) => {
  const totalConsultations = await Consultation.countDocuments();
  const completedConsultations = await Consultation.countDocuments({
    status: "completed",
  });
  const pendingConsultations = await Consultation.countDocuments({
    status: "pending",
  });
  const cancelledConsultations = await Consultation.countDocuments({
    status: "cancelled",
  });

  // الاستشارات حسب النوع
  const typeDistribution = await Consultation.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  // الدخل من الاستشارات
  const revenue = await Consultation.aggregate([
    {
      $match: { "payment.status": "paid" },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$payment.amount" },
      },
    },
  ]);

  const stats = {
    total: totalConsultations,
    completed: completedConsultations,
    pending: pendingConsultations,
    cancelled: cancelledConsultations,
    typeDistribution,
    totalRevenue: revenue[0]?.total || 0,
  };

  successResponse(res, 200, "تم الحصول على الإحصائيات بنجاح", { stats });
});

module.exports = {
  bookConsultation,
  getConsultationById,
  getMyConsultations,
  getDoctorConsultations,
  confirmPayment,
  startConsultation,
  completeConsultation,
  cancelConsultation,
  addMessage,
  getMessages,
  rateConsultation,
  getUpcomingConsultations,
  getConsultationStats,
};
