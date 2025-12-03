const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم المنتج مطلوب"],
      trim: true,
      index: true,
    },
    nameArabic: {
      type: String,
      required: [true, "الاسم العربي مطلوب"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "الوصف مطلوب"],
      maxlength: [2000, "الوصف يجب ألا يتجاوز 2000 حرف"],
    },
    scientificName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "التصنيف مطلوب"],
      enum: [
        "pain-relief",
        "antibiotics",
        "vitamins",
        "diabetes",
        "heart",
        "respiratory",
        "digestive",
        "skin-care",
        "supplements",
        "baby-care",
        "personal-care",
        "other",
      ],
    },
    categoryArabic: String,
    subCategory: String,
    price: {
      type: Number,
      required: [true, "السعر مطلوب"],
      min: [0, "السعر يجب أن يكون رقم موجب"],
    },
    discountPrice: {
      type: Number,
      min: [0, "سعر الخصم يجب أن يكون رقم موجب"],
      validate: {
        validator: function (val) {
          return !val || val < this.price;
        },
        message: "سعر الخصم يجب أن يكون أقل من السعر الأساسي",
      },
    },
    stock: {
      type: Number,
      required: [true, "الكمية المتوفرة مطلوبة"],
      min: [0, "الكمية لا يمكن أن تكون سالبة"],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String,
        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    manufacturer: {
      name: String,
      country: String,
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    dosageForm: {
      type: String,
      enum: [
        "tablet",
        "capsule",
        "syrup",
        "injection",
        "cream",
        "drops",
        "spray",
        "other",
      ],
    },
    strength: String, // e.g., "500mg", "10ml"
    packSize: String, // e.g., "30 tablets", "100ml"
    activeIngredients: [
      {
        name: String,
        quantity: String,
      },
    ],
    usageInstructions: {
      type: String,
      maxlength: [1000, "تعليمات الاستخدام يجب ألا تتجاوز 1000 حرف"],
    },
    sideEffects: [String],
    contraindications: [String],
    warnings: [String],
    storageConditions: String,
    expiryDate: Date,
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    sku: {
      type: String,
      unique: true,
      required: true,
    },
    tags: [String],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes للبحث والفلترة
productSchema.index({ name: "text", nameArabic: "text", description: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ "rating.average": -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ createdAt: -1 });
// productSchema.index({ sku: 1 });
// productSchema.index({ barcode: 1 });

// Virtual للتحقق من توفر المخزون
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// Virtual للتحقق من المخزون المنخفض
productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.lowStockThreshold && this.stock > 0;
});

// Virtual للسعر النهائي
productSchema.virtual("finalPrice").get(function () {
  return this.discountPrice || this.price;
});

// Virtual لنسبة الخصم
productSchema.virtual("discountPercentage").get(function () {
  if (!this.discountPrice) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

// Method لتحديث المخزون
productSchema.methods.updateStock = async function (
  quantity,
  operation = "decrease"
) {
  if (operation === "decrease") {
    if (this.stock < quantity) {
      throw new Error("المخزون غير كافي");
    }
    this.stock -= quantity;
    this.salesCount += quantity;
  } else if (operation === "increase") {
    this.stock += quantity;
  }

  await this.save();
};

// Method لزيادة عدد المشاهدات
productSchema.methods.incrementViews = async function () {
  this.viewsCount += 1;
  await this.save();
};

// Pre-save middleware للتحقق من البيانات
productSchema.pre("save", function (next) {
  // التأكد من وجود صورة رئيسية واحدة على الأقل
  if (this.images && this.images.length > 0) {
    const mainImages = this.images.filter((img) => img.isMain);
    if (mainImages.length === 0) {
      this.images[0].isMain = true;
    } else if (mainImages.length > 1) {
      // إذا كان هناك أكثر من صورة رئيسية، اجعل الأولى فقط رئيسية
      this.images.forEach((img, index) => {
        img.isMain = index === 0;
      });
    }
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
