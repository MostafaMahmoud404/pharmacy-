const multer = require("multer");
const path = require("path");
const fs = require("fs");

// إنشاء المجلدات المطلوبة
const createUploadDirectories = () => {
  const directories = [
    "./uploads",
    "./uploads/profiles",
    "./uploads/products",
    "./uploads/prescriptions",
    "./uploads/documents",
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

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "./uploads/";

    // تحديد المسار بناءً على نوع الملف
    if (file.fieldname === "profileImage") {
      uploadPath += "profiles/";
    } else if (file.fieldname === "productImages") {
      uploadPath += "products/";
    } else if (file.fieldname === "prescriptionFile") {
      uploadPath += "prescriptions/";
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
    // إنشاء اسم فريد للملف
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);

    // تنظيف اسم الملف
    const cleanName = nameWithoutExt
      .replace(/[^a-zA-Z0-9]/g, "-")
      .substring(0, 50);

    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

// File Filter للصور
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

// File Filter للمستندات
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
    cb(null, true);
  } else {
    cb(new Error("نوع الملف غير مسموح. يرجى رفع PDF, Word, أو صورة"), false);
  }
};

// Multer configuration للصور
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Multer configuration للمستندات
const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Multer configuration لأي ملف
const uploadAny = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = {
  uploadImage,
  uploadDocument,
  uploadAny,
  storage,
};
