const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    reviewType: {
      type: String,
      enum: ["doctor", "product", "service"],
      required: true,
    },
    // للدكاترة
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
    },
    // للمنتجات
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    // المراجع
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "المستخدم مطلوب"],
    },
    rating: {
      type: Number,
      required: [true, "التقييم مطلوب"],
      min: [1, "التقييم يجب أن يكون 1 على الأقل"],
      max: [5, "التقييم يجب ألا يتجاوز 5"],
    },
    // تقييمات تفصيلية للدكاترة
    detailedRatings: {
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      knowledge: {
        type: Number,
        min: 1,
        max: 5,
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    title: {
      type: String,
      maxlength: [100, "العنوان يجب ألا يتجاوز 100 حرف"],
    },
    comment: {
      type: String,
      required: [true, "التعليق مطلوب"],
      minlength: [10, "التعليق يجب أن يكون 10 أحرف على الأقل"],
      maxlength: [1000, "التعليق يجب ألا يتجاوز 1000 حرف"],
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    // للمنتجات
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    // رد الطبيب أو الصيدلية
    response: {
      message: String,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      respondedAt: Date,
    },
    // الحالة
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
    },
    rejectionReason: String,
    // إحصائيات
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulVotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isHelpful: Boolean,
        votedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // تقارير
    reports: [
      {
        reportedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          enum: ["spam", "offensive", "fake", "inappropriate", "other"],
        },
        description: String,
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reviewSchema.index({ doctor: 1, status: 1 });
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index لمنع المراجعة المكررة
reviewSchema.index(
  { doctor: 1, reviewer: 1, consultation: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { doctor: { $exists: true } },
  }
);
reviewSchema.index(
  { product: 1, reviewer: 1, order: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { product: { $exists: true } },
  }
);

// Virtual لحساب نسبة الفائدة
reviewSchema.virtual("helpfulPercentage").get(function () {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return Math.round((this.helpfulCount / total) * 100);
});

// Virtual للتحقق من وجود رد
reviewSchema.virtual("hasResponse").get(function () {
  return !!this.response?.message;
});

// Virtual للتقييم التفصيلي المتوسط
reviewSchema.virtual("averageDetailedRating").get(function () {
  if (!this.detailedRatings) return this.rating;

  const ratings = Object.values(this.detailedRatings).filter((r) => r);
  if (ratings.length === 0) return this.rating;

  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
});

// Pre-save middleware للتحقق من صحة البيانات
reviewSchema.pre("save", async function (next) {
  // التأكد من وجود doctor أو product
  if (!this.doctor && !this.product) {
    return next(new Error("يجب تحديد دكتور أو منتج للمراجعة"));
  }

  // التأكد من عدم وجود الاثنين معاً
  if (this.doctor && this.product) {
    return next(new Error("لا يمكن مراجعة دكتور ومنتج في نفس الوقت"));
  }

  // تحديد نوع المراجعة
  if (this.doctor) {
    this.reviewType = "doctor";
  } else if (this.product) {
    this.reviewType = "product";
  }

  next();
});

// Post-save middleware لتحديث التقييم
reviewSchema.post("save", async function () {
  if (this.doctor && this.status === "approved") {
    const Doctor = mongoose.model("Doctor");
    const doctor = await Doctor.findById(this.doctor);
    if (doctor) {
      await doctor.calculateRating();
    }
  }

  if (this.product && this.status === "approved") {
    await this.updateProductRating();
  }
});

// Post-remove middleware لتحديث التقييم عند الحذف
reviewSchema.post("remove", async function () {
  if (this.doctor) {
    const Doctor = mongoose.model("Doctor");
    const doctor = await Doctor.findById(this.doctor);
    if (doctor) {
      await doctor.calculateRating();
    }
  }

  if (this.product) {
    await this.updateProductRating();
  }
});

// Method لتحديث تقييم المنتج
reviewSchema.methods.updateProductRating = async function () {
  const stats = await mongoose.model("Review").aggregate([
    {
      $match: {
        product: this.product,
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numRatings: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    const Product = mongoose.model("Product");
    await Product.findByIdAndUpdate(this.product, {
      "rating.average": Math.round(stats[0].avgRating * 10) / 10,
      "rating.count": stats[0].numRatings,
    });
  }
};

// Method للتصويت على الفائدة
reviewSchema.methods.vote = async function (userId, isHelpful) {
  // التحقق من وجود تصويت سابق
  const existingVote = this.helpfulVotes.find(
    (vote) => vote.user.toString() === userId.toString()
  );

  if (existingVote) {
    // تحديث التصويت
    if (existingVote.isHelpful !== isHelpful) {
      if (existingVote.isHelpful) {
        this.helpfulCount -= 1;
        this.notHelpfulCount += 1;
      } else {
        this.helpfulCount += 1;
        this.notHelpfulCount -= 1;
      }
      existingVote.isHelpful = isHelpful;
      existingVote.votedAt = new Date();
    }
  } else {
    // تصويت جديد
    this.helpfulVotes.push({
      user: userId,
      isHelpful,
      votedAt: new Date(),
    });

    if (isHelpful) {
      this.helpfulCount += 1;
    } else {
      this.notHelpfulCount += 1;
    }
  }

  await this.save();
  return this;
};

// Method لإضافة رد
reviewSchema.methods.addResponse = async function (responderId, message) {
  this.response = {
    message,
    respondedBy: responderId,
    respondedAt: new Date(),
  };

  await this.save();
  return this;
};

// Method للإبلاغ
reviewSchema.methods.report = async function (reporterId, reason, description) {
  this.reports.push({
    reportedBy: reporterId,
    reason,
    description,
    reportedAt: new Date(),
  });

  // إذا كان هناك 3 تقارير أو أكثر، ضع علامة
  if (this.reports.length >= 3 && this.status === "approved") {
    this.status = "flagged";
  }

  await this.save();
  return this;
};

// Static method لحساب إحصائيات التقييمات
reviewSchema.statics.getRatingDistribution = async function (
  targetId,
  targetType
) {
  const match =
    targetType === "doctor"
      ? { doctor: targetId, status: "approved" }
      : { product: targetId, status: "approved" };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);
};

// Static method للحصول على أفضل المراجعات
reviewSchema.statics.getTopReviews = function (
  targetId,
  targetType,
  limit = 5
) {
  const match =
    targetType === "doctor"
      ? { doctor: targetId, status: "approved" }
      : { product: targetId, status: "approved" };

  return this.find(match)
    .sort({ helpfulCount: -1, createdAt: -1 })
    .limit(limit)
    .populate("reviewer", "name profileImage");
};

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
