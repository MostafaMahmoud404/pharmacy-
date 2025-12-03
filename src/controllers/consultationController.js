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
  console.log("=== Book Consultation Started ===");
  console.log("Request body:", req.body);
  console.log("User:", req.user);

  const {
    doctorId,
    type,
    scheduledTime,
    chiefComplaint,
    symptoms,
    medicalHistory,
  } = req.body;

  // 1. التحقق من وجود البيانات المطلوبة
  if (!doctorId) {
    return next(new ErrorResponse("معرف الطبيب مطلوب", 400));
  }

  if (!type) {
    return next(new ErrorResponse("نوع الاستشارة مطلوب", 400));
  }

  if (!scheduledTime) {
    return next(new ErrorResponse("وقت الاستشارة مطلوب", 400));
  }

  if (!chiefComplaint) {
    return next(new ErrorResponse("السبب الرئيسي للاستشارة مطلوب", 400));
  }

  // 2. التحقق من الطبيب - بدون populate أولاً
  console.log("Looking for doctor with ID:", doctorId);
  const doctor = await Doctor.findById(doctorId);
  
  if (!doctor) {
    console.log("Doctor not found");
    return next(new ErrorResponse("الطبيب غير موجود", 404));
  }

  console.log("Doctor found:", doctor);

  // 3. التحقق من حالة الطبيب
  if (!doctor.isVerified) {
    return next(new ErrorResponse("الطبيب غير مُفعّل", 400));
  }

  if (doctor.isAvailable === false) {
    return next(new ErrorResponse("الطبيب غير متاح حالياً", 400));
  }

  // 4. التحقق من نوع الاستشارة
  if (!["chat", "video", "audio"].includes(type)) {
    return next(new ErrorResponse("نوع الاستشارة غير صحيح", 400));
  }

  // 5. التحقق من أن الطبيب يقدم هذا النوع (إذا كان الحقل موجود)
  if (doctor.consultationTypes && Array.isArray(doctor.consultationTypes)) {
    if (!doctor.consultationTypes.includes(type)) {
      return next(
        new ErrorResponse("الطبيب لا يقدم هذا النوع من الاستشارات", 400)
      );
    }
  }

  // 6. التحقق من الموعد
  const scheduledDate = new Date(scheduledTime);
  const now = new Date();
  
  if (isNaN(scheduledDate.getTime())) {
    return next(new ErrorResponse("وقت الاستشارة غير صحيح", 400));
  }

  if (scheduledDate <= now) {
    return next(new ErrorResponse("يجب أن يكون الموعد في المستقبل", 400));
  }

  // 7. التحقق من توفر الطبيب في هذا الموعد
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

  // 8. التحقق من وجود consultationFee
  if (!doctor.consultationFee || doctor.consultationFee <= 0) {
    return next(new ErrorResponse("رسوم الاستشارة غير محددة للطبيب", 400));
  }

  // 9. توليد رقم الاستشارة يدوياً
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  
  // البحث عن آخر استشارة في نفس الشهر
  const lastConsultation = await Consultation
    .findOne({ 
      consultationNumber: new RegExp(`^CS${year}${month}`) 
    })
    .sort({ consultationNumber: -1 })
    .select('consultationNumber')
    .lean();

  let sequenceNumber = 1;
  if (lastConsultation?.consultationNumber) {
    const lastNumber = parseInt(lastConsultation.consultationNumber.slice(-6));
    sequenceNumber = lastNumber + 1;
  }

  const consultationNumber = `CS${year}${month}${String(sequenceNumber).padStart(6, "0")}`;
  console.log("Generated consultation number:", consultationNumber);

  // 10. إنشاء الاستشارة
  console.log("Creating consultation...");
  const consultationData = {
    consultationNumber, // ✅ إضافة الرقم يدوياً
    doctor: doctorId,
    patient: req.user._id,
    type,
    scheduledTime: scheduledDate,
    chiefComplaint,
    payment: {
      amount: doctor.consultationFee,
      status: "pending",
    },
  };

  // إضافة symptoms إذا كانت موجودة
  if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
    consultationData.symptoms = symptoms;
  }

  // إضافة medicalHistory إذا كانت موجودة
  if (medicalHistory && typeof medicalHistory === 'object') {
    consultationData.medicalHistory = medicalHistory;
  }

  const consultation = await Consultation.create(consultationData);
  console.log("Consultation created:", consultation._id);

  // 10. Populate البيانات للاستجابة
  await consultation.populate([
    { 
      path: "doctor",
      select: "specialty specialtyArabic consultationFee rating"
    },
    { 
      path: "patient", 
      select: "name phone email" 
    },
  ]);

  // محاولة populate user للطبيب إذا كان موجود
  try {
    await consultation.populate({
      path: "doctor",
      populate: { 
        path: "user", 
        select: "name profileImage" 
      }
    });
  } catch (err) {
    console.log("Could not populate doctor.user:", err.message);
  }

  console.log("=== Book Consultation Completed Successfully ===");

  successResponse(res, 201, "تم حجز الاستشارة بنجاح", { consultation });
});

// باقي الـ functions...
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
    userRole: isDoctor ? "doctor" : isPatient ? "patient" : "admin",
  });
});

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

const startConsultation = asyncHandler(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id)
    .populate('doctor')
    .populate('patient', 'name');

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor || doctor._id.toString() !== consultation.doctor._id.toString()) {
    return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
  }

  if (consultation.status !== "confirmed") {
    return next(new ErrorResponse("الاستشارة يجب أن تكون مؤكدة أولاً", 400));
  }

  if (consultation.payment.status !== "paid") {
    return next(new ErrorResponse("لم يتم تأكيد الدفع بعد", 400));
  }

  const now = new Date();
  const scheduledTime = new Date(consultation.scheduledTime);
  const timeDiff = (scheduledTime - now) / 60000;

  if (timeDiff > 10) {
    return next(
      new ErrorResponse("لا يمكن بدء الاستشارة قبل الموعد بأكثر من 10 دقائق", 400)
    );
  }

  if (timeDiff < -30) {
    return next(
      new ErrorResponse("تم تجاوز وقت بدء الاستشارة (أكثر من 30 دقيقة)", 400)
    );
  }

  consultation.status = "in-progress";
  consultation.actualStartTime = new Date();
  await consultation.save();

  successResponse(res, 200, "تم بدء الاستشارة بنجاح", { consultation });
});

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

  if (consultation.status !== "in-progress") {
    return next(new ErrorResponse("الاستشارة يجب أن تكون قيد التنفيذ", 400));
  }

  consultation.status = "completed";
  consultation.actualEndTime = new Date();
  consultation.doctorNotes = doctorNotes;
  consultation.diagnosis = diagnosis;

  await consultation.save();

  if (doctor.totalConsultations !== undefined) {
    await Doctor.findByIdAndUpdate(doctor._id, {
      $inc: { totalConsultations: 1 },
    });
  }

  successResponse(res, 200, "تم إنهاء الاستشارة بنجاح", { consultation });
});

const cancelConsultation = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === consultation.doctor.toString();
  const isPatient = consultation.patient.toString() === req.user._id.toString();

  if (!isDoctor && !isPatient) {
    return next(new ErrorResponse("غير مصرح لك بإلغاء هذه الاستشارة", 403));
  }

  if (["completed", "cancelled"].includes(consultation.status)) {
    return next(new ErrorResponse("لا يمكن إلغاء هذه الاستشارة", 400));
  }

  const cancelledBy = isDoctor ? "doctor" : "patient";

  consultation.status = "cancelled";
  consultation.cancelledBy = cancelledBy;
  consultation.cancellationReason = reason;
  consultation.cancelledAt = new Date();

  const hoursUntilScheduled =
    (consultation.scheduledTime - new Date()) / (1000 * 60 * 60);
  if (hoursUntilScheduled > 24 && consultation.payment.status === "paid") {
    consultation.payment.status = "refunded";
    consultation.payment.refundedAt = new Date();
    consultation.payment.refundReason = "Cancellation before 24 hours";
  }

  await consultation.save();

  successResponse(res, 200, "تم إلغاء الاستشارة بنجاح", { consultation });
});

const addMessage = asyncHandler(async (req, res, next) => {
  const { message, attachments } = req.body;

  if (!message || message.trim().length === 0) {
    return next(new ErrorResponse("الرسالة مطلوبة", 400));
  }

  const consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

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

  consultation.chatMessages.push({
    sender: req.user._id,
    senderType,
    message: message.trim(),
    attachments: attachments || [],
    timestamp: new Date(),
    isRead: false,
  });

  await consultation.save();

  const newMessage =
    consultation.chatMessages[consultation.chatMessages.length - 1];

  successResponse(res, 201, "تم إرسال الرسالة بنجاح", { message: newMessage });
});

const getMessages = asyncHandler(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id).populate(
    "chatMessages.sender",
    "name profileImage"
  );

  if (!consultation) {
    return next(new ErrorResponse("الاستشارة غير موجودة", 404));
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === consultation.doctor.toString();
  const isPatient = consultation.patient.toString() === req.user._id.toString();

  if (!isDoctor && !isPatient) {
    return next(
      new ErrorResponse("غير مصرح لك بالوصول لرسائل هذه الاستشارة", 403)
    );
  }

  const userType = isDoctor ? "doctor" : "patient";
  let hasUnreadMessages = false;

  consultation.chatMessages.forEach((msg) => {
    if (msg.senderType !== userType && !msg.isRead) {
      msg.isRead = true;
      hasUnreadMessages = true;
    }
  });

  if (hasUnreadMessages) {
    await consultation.save();
  }

  successResponse(res, 200, "تم الحصول على الرسائل بنجاح", {
    messages: consultation.chatMessages,
  });
});

const rateConsultation = asyncHandler(async (req, res, next) => {
  const { score, comment } = req.body;

  if (!score || score < 1 || score > 5) {
    return next(new ErrorResponse("التقييم يجب أن يكون بين 1 و 5", 400));
  }

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
    comment: comment || "",
    ratedAt: new Date(),
  };

  await consultation.save();

  const doctor = await Doctor.findById(consultation.doctor);
  if (doctor) {
    const result = await Consultation.aggregate([
      {
        $match: {
          doctor: doctor._id,
          "rating.score": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating.score" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      const updateData = {};
      if (doctor.rating !== undefined) {
        updateData.rating = result[0].averageRating;
      }
      if (doctor.totalRatings !== undefined) {
        updateData.totalRatings = result[0].totalRatings;
      }

      if (Object.keys(updateData).length > 0) {
        await Doctor.findByIdAndUpdate(doctor._id, updateData);
      }
    }
  }

  successResponse(res, 200, "تم تقييم الاستشارة بنجاح", { consultation });
});

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

  const typeDistribution = await Consultation.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

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