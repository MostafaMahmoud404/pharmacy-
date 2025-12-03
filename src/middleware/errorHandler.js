// Error Handler Class
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Not Found Handler - 404
const notFound = (req, res, next) => {
  const error = new ErrorResponse(`المسار غير موجود - ${req.originalUrl}`, 404);
  next(error);
};

// Main Error Handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log للأخطاء في Development
  if (process.env.NODE_ENV === "development") {
    console.error("Error Details:", {
      message: err.message,
      stack: err.stack,
      statusCode: error.statusCode,
      path: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  } else {
    // في Production، نسجل فقط الأخطاء المهمة
    if (error.statusCode === 500) {
      console.error("Server Error:", {
        message: err.message,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Mongoose Bad ObjectId Error
  if (err.name === "CastError") {
    const message = "المعرف غير صحيح";
    error = new ErrorResponse(message, 400);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    let message = "القيمة موجودة بالفعل";

    // رسائل مخصصة للحقول الشائعة
    if (field === "email") {
      message = "البريد الإلكتروني مستخدم بالفعل";
    } else if (field === "phone") {
      message = "رقم الهاتف مستخدم بالفعل";
    } else if (field === "licenseNumber") {
      message = "رقم الترخيص مستخدم بالفعل";
    } else if (field === "sku") {
      message = "رمز المنتج مستخدم بالفعل";
    } else if (field === "consultationNumber") {
      message = "رقم الاستشارة مكرر";
    }

    error = new ErrorResponse(message, 400);
    error.field = field;
    error.value = value;
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    const message = messages.join(", ");
    error = new ErrorResponse(message, 400);
    error.errors = messages;
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    const message = "Token غير صحيح";
    error = new ErrorResponse(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "انتهت صلاحية الجلسة";
    error = new ErrorResponse(message, 401);
  }

  // Multer Errors (File Upload)
  if (err.name === "MulterError") {
    let message = "خطأ في رفع الملف";

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "حجم الملف كبير جداً";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "عدد الملفات يتجاوز الحد المسموح";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "حقل الملف غير صحيح";
    }

    error = new ErrorResponse(message, 400);
  }

  // Syntax Errors (Invalid JSON)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    error = new ErrorResponse("البيانات المرسلة غير صحيحة", 400);
  }

  // Database Connection Errors
  if (err.name === "MongoNetworkError" || err.name === "MongoServerError") {
    error = new ErrorResponse("خطأ في الاتصال بقاعدة البيانات", 500);
  }

  // Rate Limit Errors (معدل)
  if (err.statusCode === 429 || err.name === "TooManyRequestsError") {
    error = new ErrorResponse(
      "تجاوزت الحد المسموح من الطلبات. حاول مرة أخرى لاحقاً",
      429
    );
  }

  // Payment Errors (جديد)
  if (err.name === "PaymentError") {
    error = new ErrorResponse("خطأ في عملية الدفع", 400);
  }

  // Authorization Errors (جديد)
  if (err.name === "UnauthorizedError") {
    error = new ErrorResponse("غير مصرح لك بهذا الإجراء", 403);
  }

  // Response Structure
  const response = {
    success: false,
    message: error.message || "خطأ في الخادم",
    ...(error.errors && { errors: error.errors }),
    ...(error.field && { field: error.field }),
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      originalError: err.name,
    }),
  };

  res.status(error.statusCode).json(response);
};

// Async Handler - لتجنب تكرار try-catch
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global Promise Rejection Handler
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // في Production، يمكن إرسال إشعار للفريق
  if (process.env.NODE_ENV === "production") {
    // إرسال إشعار (Email, Slack, etc.)
  }
});

// Global Uncaught Exception Handler
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // في Production، يجب إيقاف السيرفر بشكل آمن
  if (process.env.NODE_ENV === "production") {
    console.error("Shutting down server due to uncaught exception");
    process.exit(1);
  }
});

// Success Response Helper
const successResponse = (
  res,
  statusCode = 200,
  message,
  data = null,
  meta = null
) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    ...(meta && { meta }),
  };

  res.status(statusCode).json(response);
};

// Pagination Helper
const getPaginationData = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage,
    itemsPerPage,
    totalItems: total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null,
  };
};

// API Feature Class للبحث والفلترة والترتيب
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // البحث
  search(searchFields = []) {
    if (this.queryString.search && searchFields.length > 0) {
      const searchQuery = {
        $or: searchFields.map((field) => ({
          [field]: { $regex: this.queryString.search, $options: "i" },
        })),
      };
      this.query = this.query.find(searchQuery);
    }
    return this;
  }

  // الفلترة
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Advanced filtering (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // الترتيب
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  // اختيار حقول معينة
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  // Pagination
  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = {
  ErrorResponse,
  notFound,
  errorHandler,
  asyncHandler,
  successResponse,
  getPaginationData,
  APIFeatures,
};