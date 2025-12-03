const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: {
      type: String,
      unique: true,
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "الطبيب مطلوب"],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "المريض مطلوب"],
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
    },
    diagnosis: {
      type: String,
      required: [true, "التشخيص مطلوب"],
      maxlength: [500, "التشخيص يجب ألا يتجاوز 500 حرف"],
    },
    symptoms: [String],
    medications: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        customName: String, // إذا لم يكن المنتج موجود في النظام
        dosage: {
          type: String,
          required: true,
        },
        frequency: {
          type: String,
          required: true, // e.g., "3 times daily", "every 8 hours"
        },
        duration: {
          type: String,
          required: true, // e.g., "7 days", "2 weeks"
        },
        quantity: {
          type: Number,
          required: true,
        },
        instructions: {
          type: String,
          maxlength: [300, "التعليمات يجب ألا تتجاوز 300 حرف"],
        },
        beforeAfterMeal: {
          type: String,
          enum: ["before", "after", "with", "not-specified"],
          default: "not-specified",
        },
      },
    ],
    notes: {
      type: String,
      maxlength: [1000, "الملاحظات يجب ألا تتجاوز 1000 حرف"],
    },
    warnings: [String],
    followUpDate: Date,
    followUpNotes: String,
    status: {
      type: String,
      enum: ["active", "fulfilled", "expired", "cancelled"],
      default: "active",
    },
    sentToPharmacy: {
      type: Boolean,
      default: false,
    },
    pharmacyReceivedAt: Date,
    expiryDate: {
      type: Date,
      required: true,
      default: function () {
        // الروشتة صالحة لمدة 30 يوم
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
    },
    pdfUrl: String,
    pdfGeneratedAt: Date,
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    metadata: {
      downloadedAt: Date,
      downloadCount: {
        type: Number,
        default: 0,
      },
      viewCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ expiryDate: 1 });
prescriptionSchema.index({ sentToPharmacy: 1 });

// Virtual للتحقق من انتهاء الصلاحية
prescriptionSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date();
});

// Virtual للتحقق من إمكانية استخدام الروشتة
prescriptionSchema.virtual("isValid").get(function () {
  return this.status === "active" && !this.isExpired;
});

// Pre-save middleware لتوليد رقم الروشتة
prescriptionSchema.pre("save", async function (next) {
  if (!this.prescriptionNumber) {
    const count = await mongoose.model("Prescription").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    this.prescriptionNumber = `RX${year}${month}${String(count + 1).padStart(
      6,
      "0"
    )}`;
  }
  next();
});

// Pre-save middleware للتحقق من انتهاء الصلاحية وتحديث الحالة
prescriptionSchema.pre("save", function (next) {
  if (this.isExpired && this.status === "active") {
    this.status = "expired";
  }
  next();
});

// Method لإرسال الروشتة للصيدلية
prescriptionSchema.methods.sendToPharmacy = async function () {
  if (!this.isValid) {
    throw new Error("الروشتة غير صالحة أو منتهية الصلاحية");
  }

  this.sentToPharmacy = true;
  this.pharmacyReceivedAt = new Date();
  await this.save();

  return this;
};

// Method لتسجيل عملية تحميل
prescriptionSchema.methods.recordDownload = async function () {
  this.metadata.downloadCount += 1;
  this.metadata.downloadedAt = new Date();
  await this.save();
};

// Method لتسجيل عملية مشاهدة
prescriptionSchema.methods.recordView = async function () {
  this.metadata.viewCount += 1;
  await this.save();
};

// Static method للحصول على الروشتات المنتهية
prescriptionSchema.statics.getExpiredPrescriptions = function () {
  return this.find({
    expiryDate: { $lt: new Date() },
    status: "active",
  });
};

// Static method للحصول على الروشتات القريبة من الانتهاء
prescriptionSchema.statics.getExpiringPrescriptions = function (days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    expiryDate: { $lte: futureDate, $gt: new Date() },
    status: "active",
  });
};

const Prescription = mongoose.model("Prescription", prescriptionSchema);

module.exports = Prescription;
