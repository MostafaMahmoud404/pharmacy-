const mongoose = require("mongoose");

const pharmacySchema = new mongoose.Schema(
  {
    // ربط الصيدلية بالمستخدم
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "يجب ربط الصيدلية بمستخدم"],
      unique: true,
    },

    // معلومات الصيدلية
    pharmacyName: {
      type: String,
      required: [true, "اسم الصيدلية مطلوب"],
      trim: true,
      minlength: [3, "اسم الصيدلية يجب أن يكون 3 أحرف على الأقل"],
      maxlength: [100, "اسم الصيدلية يجب ألا يتجاوز 100 حرف"],
    },

    pharmacyNameArabic: {
      type: String,
      required: [true, "اسم الصيدلية بالعربية مطلوب"],
      trim: true,
      minlength: [3, "اسم الصيدلية يجب أن يكون 3 أحرف على الأقل"],
      maxlength: [100, "اسم الصيدلية يجب ألا يتجاوز 100 حرف"],
    },

    // رخصة الصيدلية
    licenseNumber: {
      type: String,
      required: [true, "رقم ترخيص الصيدلية مطلوب"],
      unique: true,
      trim: true,
      minlength: [5, "رقم الترخيص يجب أن يكون 5 أحرف على الأقل"],
      maxlength: [50, "رقم الترخيص يجب ألا يتجاوز 50 حرف"],
    },

    licenseFile: {
      type: String,
      required: [true, "ملف ترخيص الصيدلية مطلوب"],
    },

    licenseExpiry: {
      type: Date,
      required: [true, "تاريخ انتهاء الترخيص مطلوب"],
    },

    // العنوان
    address: {
      street: {
        type: String,
        required: [true, "عنوان الشارع مطلوب"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "المدينة مطلوبة"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "المحافظة مطلوبة"],
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },

    // معلومات إضافية
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "الوصف يجب ألا يتجاوز 1000 حرف"],
    },

    workingHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
    },

    // حالة التوفر
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // حالة التحقق من الصيدلية
    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: Date,

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // التقييم
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // عدد المنتجات
    totalProducts: {
      type: Number,
      default: 0,
    },

    // عدد الطلبات
    totalOrders: {
      type: Number,
      default: 0,
    },

    // صورة الصيدلية
    pharmacyImage: {
      type: String,
      default: "default-pharmacy.png",
    },

    // صور إضافية
    images: [String],

    // وسائل التواصل والتوصيل
    deliveryEnabled: {
      type: Boolean,
      default: true,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    freeDeliveryThreshold: {
      type: Number,
      default: 0,
    },

    acceptsInsurance: {
      type: Boolean,
      default: false,
    },

    insuranceProviders: [String],

    // إحصائيات
    stats: {
      completedOrders: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 }, // بالدقائق
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// pharmacySchema.index({ user: 1 });
// pharmacySchema.index({ licenseNumber: 1 });
pharmacySchema.index({ "address.city": 1 });
pharmacySchema.index({ isVerified: 1, isAvailable: 1 });
pharmacySchema.index({ rating: -1 });
pharmacySchema.index({ "address.coordinates": "2dsphere" }); // للبحث الجغرافي

// Virtual للمنتجات
pharmacySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "pharmacy",
});

// Method لحساب التقييم
pharmacySchema.methods.calculateRating = async function () {
  const Review = mongoose.model("Review");
  const stats = await Review.aggregate([
    { $match: { pharmacy: this._id } },
    {
      $group: {
        _id: "$pharmacy",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.rating = Math.round(stats[0].avgRating * 10) / 10;
    this.totalReviews = stats[0].totalReviews;
  } else {
    this.rating = 0;
    this.totalReviews = 0;
  }

  await this.save();
};

// Method للتحقق من ساعات العمل
pharmacySchema.methods.isOpenNow = function () {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "lowercase" });
  const currentTime = now.toTimeString().slice(0, 5);

  const todayHours = this.workingHours[dayName];
  
  if (!todayHours || !todayHours.isOpen) {
    return false;
  }

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);

module.exports = Pharmacy;