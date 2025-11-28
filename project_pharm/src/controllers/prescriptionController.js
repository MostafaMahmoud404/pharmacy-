const Prescription = require("../models/Prescription");
const Consultation = require("../models/Consultation");
const Doctor = require("../models/Doctor");
const Product = require("../models/Product");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// @desc    Create prescription (Doctor only)
// @route   POST /api/prescriptions
// @access  Private/Doctor
const createPrescription = asyncHandler(async (req, res, next) => {
  const {
    patientId,
    consultationId,
    diagnosis,
    symptoms,
    medications,
    notes,
    warnings,
    followUpDate,
    followUpNotes,
  } = req.body;

  // الحصول على ملف الدكتور
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) {
    return next(new ErrorResponse("ملف الدكتور غير موجود", 404));
  }

  // التحقق من الاستشارة
  if (consultationId) {
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new ErrorResponse("الاستشارة غير موجودة", 404));
    }
    if (consultation.doctor.toString() !== doctor._id.toString()) {
      return next(
        new ErrorResponse("غير مصرح لك بإنشاء روشتة لهذه الاستشارة", 403)
      );
    }
  }

  // التحقق من المنتجات وتحديث بياناتها
  const processedMedications = await Promise.all(
    medications.map(async (med) => {
      if (med.product) {
        const product = await Product.findById(med.product);
        if (!product) {
          throw new Error(`المنتج ${med.product} غير موجود`);
        }
        return {
          ...med,
          customName: product.name,
        };
      }
      return med;
    })
  );

  // إنشاء الروشتة
  const prescription = await Prescription.create({
    doctor: doctor._id,
    patient: patientId,
    consultation: consultationId,
    diagnosis,
    symptoms,
    medications: processedMedications,
    notes,
    warnings,
    followUpDate,
    followUpNotes,
  });

  // تحديث الاستشارة
  if (consultationId) {
    await Consultation.findByIdAndUpdate(consultationId, {
      prescription: prescription._id,
    });
  }

  // إنشاء PDF
  await generatePrescriptionPDF(prescription);

  await prescription.populate([
    { path: "doctor", populate: { path: "user", select: "name" } },
    { path: "patient", select: "name phone" },
    { path: "medications.product", select: "name nameArabic" },
  ]);

  successResponse(res, 201, "تم إنشاء الروشتة بنجاح", { prescription });
});

// @desc    Get prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
const getPrescriptionById = asyncHandler(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id).populate([
    { path: "doctor", populate: { path: "user", select: "name phone" } },
    { path: "patient", select: "name phone" },
    { path: "consultation", select: "consultationNumber scheduledTime" },
    { path: "medications.product", select: "name nameArabic images price" },
  ]);

  if (!prescription) {
    return next(new ErrorResponse("الروشتة غير موجودة", 404));
  }

  // التحقق من الصلاحيات
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === prescription.doctor._id.toString();
  const isPatient =
    prescription.patient._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  const isPharmacist = req.user.role === "pharmacist";

  if (!isDoctor && !isPatient && !isAdmin && !isPharmacist) {
    return next(new ErrorResponse("غير مصرح لك بالوصول لهذه الروشتة", 403));
  }

  // تسجيل المشاهدة
  await prescription.recordView();

  successResponse(res, 200, "تم الحصول على الروشتة بنجاح", { prescription });
});

// @desc    Get my prescriptions (Patient)
// @route   GET /api/prescriptions/my
// @access  Private/Customer
const getMyPrescriptions = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(
    Prescription.find({ patient: req.user._id })
      .populate("doctor", "user specialty specialtyArabic")
      .populate({ path: "doctor", populate: { path: "user", select: "name" } }),
    req.query
  )
    .sort()
    .paginate();

  const prescriptions = await features.query;
  const total = await Prescription.countDocuments({ patient: req.user._id });

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الروشتات بنجاح",
    { prescriptions },
    pagination
  );
});

// @desc    Get doctor's prescriptions
// @route   GET /api/prescriptions/doctor/my
// @access  Private/Doctor
const getDoctorPrescriptions = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) {
    return next(new ErrorResponse("ملف الدكتور غير موجود", 404));
  }

  const features = new APIFeatures(
    Prescription.find({ doctor: doctor._id }).populate(
      "patient",
      "name phone profileImage"
    ),
    req.query
  )
    .sort()
    .paginate();

  const prescriptions = await features.query;
  const total = await Prescription.countDocuments({ doctor: doctor._id });

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الروشتات بنجاح",
    { prescriptions },
    pagination
  );
});

// @desc    Send prescription to pharmacy
// @route   POST /api/prescriptions/:id/send-to-pharmacy
// @access  Private/Doctor/Customer
const sendToPharmacy = asyncHandler(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    return next(new ErrorResponse("الروشتة غير موجودة", 404));
  }

  // التحقق من الصلاحيات
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === prescription.doctor._id.toString();
  const isPatient =
    prescription.patient._id.toString() === req.user._id.toString();

  if (!isDoctor && !isPatient) {
    return next(new ErrorResponse("غير مصرح لك بهذا الإجراء", 403));
  }

  await prescription.sendToPharmacy();

  successResponse(res, 200, "تم إرسال الروشتة للصيدلية بنجاح", {
    prescription,
  });
});

// @desc    Download prescription PDF
// @route   GET /api/prescriptions/:id/download
// @access  Private
const downloadPrescription = asyncHandler(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id).populate([
    { path: "doctor", populate: { path: "user", select: "name phone" } },
    { path: "patient", select: "name phone" },
    { path: "medications.product", select: "name nameArabic" },
  ]);

  if (!prescription) {
    return next(new ErrorResponse("الروشتة غير موجودة", 404));
  }

  // التحقق من الصلاحيات
  const doctor = await Doctor.findOne({ user: req.user._id });
  const isDoctor =
    doctor && doctor._id.toString() === prescription.doctor._id.toString();
  const isPatient =
    prescription.patient._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  const isPharmacist = req.user.role === "pharmacist";

  if (!isDoctor && !isPatient && !isAdmin && !isPharmacist) {
    return next(new ErrorResponse("غير مصرح لك بتحميل هذه الروشتة", 403));
  }

  // إذا لم يكن PDF موجود، نولده
  if (!prescription.pdfUrl || !fs.existsSync(prescription.pdfUrl)) {
    await generatePrescriptionPDF(prescription);
  }

  // تسجيل التحميل
  await prescription.recordDownload();

  // إرسال الملف
  res.download(
    prescription.pdfUrl,
    `prescription-${prescription.prescriptionNumber}.pdf`
  );
});

// @desc    Get pharmacy prescriptions (Pharmacist)
// @route   GET /api/prescriptions/pharmacy
// @access  Private/Pharmacist
const getPharmacyPrescriptions = asyncHandler(async (req, res, next) => {
  const { status } = req.query;

  let query = { sentToPharmacy: true };

  if (status) {
    query.status = status;
  }

  const features = new APIFeatures(
    Prescription.find(query).populate([
      { path: "doctor", populate: { path: "user", select: "name" } },
      { path: "patient", select: "name phone" },
      { path: "medications.product", select: "name nameArabic stock price" },
    ]),
    req.query
  )
    .sort()
    .paginate();

  const prescriptions = await features.query;
  const total = await Prescription.countDocuments(query);

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على الروشتات بنجاح",
    { prescriptions },
    pagination
  );
});

// @desc    Update prescription status
// @route   PUT /api/prescriptions/:id/status
// @access  Private/Admin/Pharmacist
const updatePrescriptionStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    return next(new ErrorResponse("الروشتة غير موجودة", 404));
  }

  prescription.status = status;
  await prescription.save();

  successResponse(res, 200, "تم تحديث حالة الروشتة بنجاح", { prescription });
});

// Helper Function - Generate PDF
const generatePrescriptionPDF = async (prescription) => {
  return new Promise(async (resolve, reject) => {
    try {
      // التأكد من وجود المجلد
      const uploadsDir = path.join(__dirname, "../../uploads/prescriptions");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `prescription-${prescription.prescriptionNumber}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text("روشتة طبية", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`رقم الروشتة: ${prescription.prescriptionNumber}`, {
          align: "right",
        });
      doc.text(
        `التاريخ: ${new Date(prescription.createdAt).toLocaleDateString(
          "ar-EG"
        )}`,
        { align: "right" }
      );
      doc.moveDown();

      // Doctor Info
      await prescription.populate("doctor");
      await prescription.doctor.populate("user");

      doc.fontSize(14).text("معلومات الطبيب:", { underline: true });
      doc.fontSize(11).text(`الاسم: ${prescription.doctor.user.name}`);
      doc.text(`التخصص: ${prescription.doctor.specialtyArabic}`);
      doc.text(`رقم الترخيص: ${prescription.doctor.licenseNumber}`);
      doc.moveDown();

      // Patient Info
      await prescription.populate("patient");
      doc.fontSize(14).text("معلومات المريض:", { underline: true });
      doc.fontSize(11).text(`الاسم: ${prescription.patient.name}`);
      doc.text(`رقم الهاتف: ${prescription.patient.phone}`);
      doc.moveDown();

      // Diagnosis
      doc.fontSize(14).text("التشخيص:", { underline: true });
      doc.fontSize(11).text(prescription.diagnosis);
      doc.moveDown();

      // Medications
      doc.fontSize(14).text("الأدوية الموصوفة:", { underline: true });
      prescription.medications.forEach((med, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${med.customName || med.product?.name || "دواء"}`
          );
        doc.fontSize(10).text(`   الجرعة: ${med.dosage}`);
        doc.text(`   التكرار: ${med.frequency}`);
        doc.text(`   المدة: ${med.duration}`);
        if (med.instructions) {
          doc.text(`   التعليمات: ${med.instructions}`);
        }
        doc.moveDown(0.5);
      });

      // Notes
      if (prescription.notes) {
        doc.moveDown();
        doc.fontSize(14).text("ملاحظات:", { underline: true });
        doc.fontSize(11).text(prescription.notes);
      }

      // Warnings
      if (prescription.warnings && prescription.warnings.length > 0) {
        doc.moveDown();
        doc.fontSize(14).text("تحذيرات:", { underline: true, color: "red" });
        prescription.warnings.forEach((warning) => {
          doc.fontSize(10).text(`• ${warning}`, { color: "red" });
        });
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(10)
        .text("هذه الروشتة صالحة لمدة 30 يوم من تاريخ الإصدار", {
          align: "center",
          color: "gray",
        });

      doc.end();

      stream.on("finish", async () => {
        prescription.pdfUrl = filePath;
        prescription.pdfGeneratedAt = new Date();
        await prescription.save({ validateBeforeSave: false });
        resolve(filePath);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getMyPrescriptions,
  getDoctorPrescriptions,
  sendToPharmacy,
  downloadPrescription,
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
};
