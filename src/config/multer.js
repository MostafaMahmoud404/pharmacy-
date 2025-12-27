// config/multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===== CREATE UPLOAD DIRECTORIES =====
const createUploadDirectories = () => {
  const directories = [
    "./uploads",
    "./uploads/profiles",
    "./uploads/products",
    "./uploads/prescriptions",
    "./uploads/documents",
    "./uploads/doctor-licenses",
    "./uploads/pharmacy-licenses", // ✅ مجلد جديد للصيدليات
    "./uploads/pharmacy-images",   // ✅ مجلد لصور الصيدليات
    "./uploads/reviews",
    "./uploads/deliveries",
    "./uploads/reports",
    "./uploads/invoices",
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

createUploadDirectories();

// ===== STORAGE CONFIGURATION =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "./uploads/";

    // Determine upload path based on fieldname
    if (file.fieldname === "profileImage") {
      uploadPath += "profiles/";
    } else if (file.fieldname === "productImages") {
      uploadPath += "products/";
    } else if (file.fieldname === "prescriptionFile") {
      uploadPath += "prescriptions/";
    } else if (file.fieldname === "licenseFile") {
      // ✅ التحقق من نوع المستخدم لتحديد المسار
      if (req.body.pharmacyName || req.body.pharmacyNameArabic) {
        uploadPath += "pharmacy-licenses/"; // للصيدليات
      } else {
        uploadPath += "doctor-licenses/"; // للأطباء
      }
    } else if (file.fieldname === "pharmacyImage") {
      uploadPath += "pharmacy-images/"; // ✅ صورة الصيدلية
    } else if (
      file.fieldname === "documents" ||
      file.fieldname === "verificationDocuments"
    ) {
      uploadPath += "documents/";
    } else if (file.fieldname === "reviewImages") {
      uploadPath += "reviews/";
    } else if (file.fieldname === "deliveryProof") {
      uploadPath += "deliveries/";
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);

    // Clean filename
    const cleanName = nameWithoutExt
      .replace(/[^a-zA-Z0-9]/g, "-")
      .substring(0, 50);

    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

// ===== FILE FILTERS =====

// Filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("نوع الملف غير مسموح. يرجى رفع صورة (JPG, PNG, WEBP, GIF)"),
      false
    );
  }
};

// Filter for documents (PDFs, Images, Word docs)
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log(`✅ File accepted: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  } else {
    console.error(`❌ File rejected: ${file.originalname} (${file.mimetype})`);
    cb(
      new Error("نوع الملف غير مسموح. يرجى رفع PDF, Word, JPG, أو PNG"),
      false
    );
  }
};

// ===== MULTER CONFIGURATIONS =====

// For image uploads
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// For document uploads (including Doctor & Pharmacy Licenses)
const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// For any file uploads
const uploadAny = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// ===== ERROR HANDLER FOR MULTER =====
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        success: false,
        message: "حجم الملف كبير جداً",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "عدد الملفات كبير جداً",
      });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

module.exports = {
  uploadImage,
  uploadDocument,
  uploadAny,
  storage,
  handleMulterError,
};