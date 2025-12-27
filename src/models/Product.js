const mongoose = require("mongoose");

// Image Schema
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  isMain: {
    type: Boolean,
    default: false,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ Constants for enums
const CATEGORIES = [
  "Medications",
  "Vitamins and Supplements",
  "Personal Care",
  "Medical Equipment",
  "Baby and Mother Care",
  "Skin Care",
  "Herbal and Natural",
];

const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Drops",
  "Spray",
  "Powder",
  "Solution",
];

// Product Schema
const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "اسم المنتج مطلوب"],
      trim: true,
      maxlength: [200, "اسم المنتج يجب ألا يتجاوز 200 حرف"],
    },
    nameArabic: {
      type: String,
      trim: true,
      maxlength: [200, "الاسم بالعربية يجب ألا يتجاوز 200 حرف"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "الوصف يجب ألا يتجاوز 2000 حرف"],
    },
    scientificName: {
      type: String,
      trim: true,
    },

    // Category
    category: {
      type: String,
      required: [true, "التصنيف مطلوب"],
      trim: true,
      validate: {
        validator: function (v) {
          return CATEGORIES.includes(v);
        },
        message: (props) =>
          `التصنيف "${props.value}" غير صحيح. القيم المتاحة: ${CATEGORIES.join(
            ", "
          )}`,
      },
    },
    categoryArabic: {
      type: String,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },

    // Pricing
    price: {
      type: Number,
      required: [true, "السعر مطلوب"],
      min: [0, "السعر يجب أن يكون موجباً"],
    },
    discountPrice: {
      type: Number,
      min: [0, "سعر الخصم يجب أن يكون موجباً"],
      validate: {
        validator: function (value) {
          return !value || value < this.price;
        },
        message: "سعر الخصم يجب أن يكون أقل من السعر الأصلي",
      },
    },

    // Stock
    stock: {
      type: Number,
      required: [true, "الكمية المتاحة مطلوبة"],
      min: [0, "الكمية يجب أن تكون موجبة"],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },

    // Images
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: function (images) {
          return images.length <= 5;
        },
        message: "لا يمكن رفع أكثر من 5 صور",
      },
    },

    // Medical Information
    manufacturer: {
      type: String,
      trim: true,
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    dosageForm: {
      type: String,
      trim: true,
      enum: {
        values: DOSAGE_FORMS,
        message:
          "شكل الجرعة غير صحيح. القيم المتاحة: " + DOSAGE_FORMS.join(", "),
      },
    },
    strength: {
      type: String,
      trim: true,
    },
    packSize: {
      type: String,
      trim: true,
    },
    activeIngredients: {
      type: [String],
      default: [],
    },
    usageInstructions: {
      type: String,
      trim: true,
    },
    sideEffects: {
      type: [String],
      default: [],
    },
    contraindications: {
      type: [String],
      default: [],
    },
    warnings: {
      type: [String],
      default: [],
    },
    storageConditions: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },

    // Product Identifiers
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    sku: {
      type: String,
      required: [true, "رمز المنتج (SKU) مطلوب"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Tags & Search
    tags: {
      type: [String],
      default: [],
    },

    // Ratings & Reviews
    rating: {
      type: Number,
      default: 0,
      min: [0, "التقييم يجب أن يكون بين 0 و 5"],
      max: [5, "التقييم يجب أن يكون بين 0 و 5"],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Sales & Analytics
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Metadata
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

// ===================================
// INDEXES
// ===================================
productSchema.index({ name: "text", nameArabic: "text", description: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ stock: 1 });
// Removed duplicate indexes for sku and barcode as they are already unique
productSchema.index({ tags: 1 });

// ===================================
// VIRTUALS
// ===================================

// Final Price (after discount)
productSchema.virtual("finalPrice").get(function () {
  return this.discountPrice && this.discountPrice > 0
    ? this.discountPrice
    : this.price;
});

// Discount Percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.discountPrice && this.discountPrice > 0 && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// In Stock Status
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// Low Stock Status
productSchema.virtual("isLowStock").get(function () {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

// Main Image
productSchema.virtual("mainImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  const main = this.images.find((img) => img.isMain);
  return main || this.images[0];
});

// ===================================
// METHODS
// ===================================

// Update Stock
productSchema.methods.updateStock = async function (quantity, operation) {
  if (operation === "add") {
    this.stock += quantity;
  } else if (operation === "subtract") {
    if (this.stock < quantity) {
      throw new Error("الكمية المطلوبة غير متوفرة في المخزون");
    }
    this.stock -= quantity;
  }
  await this.save();
};

// Increment Views
productSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save({ validateBeforeSave: false });
};

// Update Rating
productSchema.methods.updateRating = async function (newRating) {
  const totalRating = this.rating * this.reviewCount + newRating;
  this.reviewCount += 1;
  this.rating = totalRating / this.reviewCount;
  await this.save();
};

// ===================================
// STATIC METHODS
// ===================================

// Get Low Stock Products
productSchema.statics.getLowStockProducts = function () {
  return this.find({
    isActive: true,
    stock: { $gt: 0, $lte: 10 },
  }).sort("stock");
};

// Get Out of Stock Products
productSchema.statics.getOutOfStockProducts = function () {
  return this.find({
    isActive: true,
    stock: 0,
  });
};

// Get Featured Products
productSchema.statics.getFeaturedProducts = function (limit = 10) {
  return this.find({
    isFeatured: true,
    isActive: true,
  })
    .sort("-rating -salesCount")
    .limit(limit);
};

// Get Best Sellers
productSchema.statics.getBestSellers = function (limit = 10) {
  return this.find({
    isActive: true,
  })
    .sort("-salesCount")
    .limit(limit);
};

// Get available categories
productSchema.statics.getCategories = function () {
  return CATEGORIES;
};

// Get available dosage forms
productSchema.statics.getDosageForms = function () {
  return DOSAGE_FORMS;
};

// ===================================
// MIDDLEWARE
// ===================================

// Pre-save middleware
productSchema.pre("save", function (next) {
  // Trim and validate category
  if (this.category) {
    this.category = this.category.trim();
  }

  // Trim and validate dosageForm
  if (this.dosageForm) {
    this.dosageForm = this.dosageForm.trim();
  }

  // Convert SKU to uppercase
  if (this.sku) {
    this.sku = this.sku.trim().toUpperCase();
  }

  // Ensure at least one image is marked as main
  if (this.images && this.images.length > 0) {
    const hasMainImage = this.images.some((img) => img.isMain);
    if (!hasMainImage) {
      this.images[0].isMain = true;
    }
  }

  // Validate discount price
  if (this.discountPrice && this.discountPrice >= this.price) {
    this.discountPrice = undefined;
  }

  next();
});

// Pre-remove middleware
productSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    // Clean up related data if needed
    next();
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
