const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ErrorResponse } = require("./errorHandler");

// إنشاء المجلدات إذا لم تكن موجودة
const createUploadDirs = () => {
  const dirs = [
    "./uploads",
    "./uploads/profiles",
    "./uploads/products",
    "./uploads/prescriptions",
    "./uploads/documents",
    "./uploads/reviews",
    "./uploads/deliveries",
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

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

// File Filter - للتحقق من نوع الملف
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ErrorResponse(
          `نوع الملف غير مسموح. الأنواع المسموحة: ${allowedTypes.join(", ")}`,
          400
        ),
        false
      );
    }
  };
};

// Image Filter
const imageFilter = fileFilter([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Document Filter
const documentFilter = fileFilter([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

// Upload Configurations

// صورة واحدة (Profile, Product main image)
const uploadSingle = (fieldName, maxSize = 5 * 1024 * 1024) => {
  return multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: maxSize,
    },
  }).single(fieldName);
};

// عدة صور (Product gallery, Review images)
const uploadMultiple = (fieldName, maxCount = 5, maxSize = 5 * 1024 * 1024) => {
  return multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: maxSize,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

// ملفات متعددة بحقول مختلفة
const uploadFields = (fields, maxSize = 5 * 1024 * 1024) => {
  return multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: maxSize,
    },
  }).fields(fields);
};

// رفع المستندات (PDF, Word)
const uploadDocument = (fieldName, maxSize = 10 * 1024 * 1024) => {
  return multer({
    storage: storage,
    fileFilter: documentFilter,
    limits: {
      fileSize: maxSize,
    },
  }).single(fieldName);
};

// رفع عدة مستندات
const uploadDocuments = (
  fieldName,
  maxCount = 5,
  maxSize = 10 * 1024 * 1024
) => {
  return multer({
    storage: storage,
    fileFilter: documentFilter,
    limits: {
      fileSize: maxSize,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

// Upload Any (لأي نوع من الملفات - استخدام حذر)
const uploadAny = (maxSize = 10 * 1024 * 1024) => {
  return multer({
    storage: storage,
    limits: {
      fileSize: maxSize,
    },
  }).any();
};

// Helper function لحذف ملف
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Helper function لحذف عدة ملفات
const deleteFiles = (filePaths) => {
  const results = filePaths.map((filePath) => deleteFile(filePath));
  return results.every((result) => result === true);
};

// Middleware للتنظيف التلقائي عند حدوث خطأ
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  const cleanup = () => {
    if (res.statusCode >= 400) {
      // حذف الملفات المرفوعة في حالة حدوث خطأ
      if (req.file) {
        deleteFile(req.file.path);
      }
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach((file) => deleteFile(file.path));
        } else {
          Object.values(req.files).forEach((fileArray) => {
            fileArray.forEach((file) => deleteFile(file.path));
          });
        }
      }
    }
  };

  res.send = function (data) {
    cleanup();
    originalSend.call(this, data);
  };

  res.json = function (data) {
    cleanup();
    originalJson.call(this, data);
  };

  next();
};

// Get file URL helper
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/${filename}`;
};

// Validate image dimensions (optional)
const validateImageDimensions = (minWidth, minHeight, maxWidth, maxHeight) => {
  return async (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    try {
      const sharp = require("sharp");
      const files = req.files || [req.file];

      for (const file of files) {
        if (file.mimetype.startsWith("image/")) {
          const metadata = await sharp(file.path).metadata();

          if (metadata.width < minWidth || metadata.height < minHeight) {
            deleteFile(file.path);
            return res.status(400).json({
              success: false,
              message: `الصورة صغيرة جداً. الحد الأدنى: ${minWidth}x${minHeight}px`,
            });
          }

          if (metadata.width > maxWidth || metadata.height > maxHeight) {
            deleteFile(file.path);
            return res.status(400).json({
              success: false,
              message: `الصورة كبيرة جداً. الحد الأقصى: ${maxWidth}x${maxHeight}px`,
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error("Image validation error:", error);
      next();
    }
  };
};

// Resize image helper
const resizeImage = async (filePath, width, height, quality = 80) => {
  try {
    const sharp = require("sharp");
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, ext);
    const resizedPath = path.join(dir, `${filename}-resized${ext}`);

    await sharp(filePath)
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toFile(resizedPath);

    // حذف الملف الأصلي واستبداله بالمحسّن
    deleteFile(filePath);
    fs.renameSync(resizedPath, filePath);

    return filePath;
  } catch (error) {
    console.error("Image resize error:", error);
    throw error;
  }
};

// Compress image helper
const compressImage = async (filePath, quality = 80) => {
  try {
    const sharp = require("sharp");
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, ext);
    const compressedPath = path.join(dir, `${filename}-compressed${ext}`);

    await sharp(filePath)
      .jpeg({ quality, progressive: true })
      .toFile(compressedPath);

    // حذف الملف الأصلي واستبداله بالمضغوط
    const originalSize = fs.statSync(filePath).size;
    const compressedSize = fs.statSync(compressedPath).size;

    if (compressedSize < originalSize) {
      deleteFile(filePath);
      fs.renameSync(compressedPath, filePath);
    } else {
      deleteFile(compressedPath);
    }

    return filePath;
  } catch (error) {
    console.error("Image compression error:", error);
    throw error;
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadDocument,
  uploadDocuments,
  uploadAny,
  deleteFile,
  deleteFiles,
  cleanupOnError,
  getFileUrl,
  validateImageDimensions,
  resizeImage,
  compressImage,
};
