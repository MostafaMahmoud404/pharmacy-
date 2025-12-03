const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "العميل مطلوب"],
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String, // حفظ اسم المنتج وقت الطلب
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "الكمية يجب أن تكون 1 على الأقل"],
        },
        subtotal: {
          type: Number,
          required: true,
        },
        requiresPrescription: Boolean,
      },
    ],
    pricing: {
      subtotal: {
        type: Number,
        required: true,
      },
      deliveryFee: {
        type: Number,
        default: 0,
      },
      discount: {
        amount: {
          type: Number,
          default: 0,
        },
        code: String,
        type: {
          type: String,
          enum: ["percentage", "fixed"],
        },
      },
      tax: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    deliveryAddress: {
      label: String,
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: String,
      phone: {
        type: String,
        required: true,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      instructions: String,
    },
    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "wallet", "insurance"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paidAt: Date,
      refundedAt: Date,
      refundAmount: Number,
      refundReason: String,
    },
    status: {
      type: String,
      enum: [
        "pending", // في انتظار التأكيد
        "confirmed", // تم التأكيد
        "preparing", // جاري التجهيز
        "ready-for-pickup", // جاهز للشحن
        "out-for-delivery", // في الطريق
        "delivered", // تم التوصيل
        "cancelled", // ملغي
        "returned", // مرتجع
      ],
      default: "pending",
    },
    statusHistory: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    delivery: {
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      estimatedDeliveryTime: Date,
      actualDeliveryTime: Date,
      trackingNumber: String,
      notes: String,
    },
    pharmacyNotes: {
      type: String,
      maxlength: [500, "ملاحظات الصيدلية يجب ألا تتجاوز 500 حرف"],
    },
    customerNotes: {
      type: String,
      maxlength: [500, "ملاحظات العميل يجب ألا تتجاوز 500 حرف"],
    },
    prescriptionVerification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: Date,
      verificationNotes: String,
    },
    cancelledBy: {
      type: String,
      enum: ["customer", "pharmacy", "system"],
    },
    cancellationReason: String,
    cancelledAt: Date,
    returnDetails: {
      reason: String,
      requestedAt: Date,
      approvedAt: Date,
      completedAt: Date,
      refundAmount: Number,
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      ratedAt: Date,
    },
    invoiceUrl: String,
    metadata: {
      source: {
        type: String,
        enum: ["web", "mobile", "consultation"],
        default: "web",
      },
      ipAddress: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
/*orderSchema.index({ orderNumber: 1 });*/

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ "delivery.assignedTo": 1 });
orderSchema.index({ createdAt: -1 });

// Virtual لمعرفة إذا كان الطلب قابل للإلغاء
orderSchema.virtual("canCancel").get(function () {
  return ["pending", "confirmed", "preparing"].includes(this.status);
});

// Virtual لمعرفة إذا كان الطلب قابل للإرجاع
orderSchema.virtual("canReturn").get(function () {
  if (this.status !== "delivered") return false;

  const deliveryDate = this.delivery.actualDeliveryTime;
  if (!deliveryDate) return false;

  const daysSinceDelivery = (new Date() - deliveryDate) / (1000 * 60 * 60 * 24);
  return daysSinceDelivery <= 7; // يمكن الإرجاع خلال 7 أيام
});

// Virtual لحساب عدد المنتجات
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save middleware لتوليد رقم الطلب
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    this.orderNumber = `ORD${year}${month}${String(count + 1).padStart(
      6,
      "0"
    )}`;
  }

  // حساب الأسعار تلقائياً
  if (this.isModified("items")) {
    this.pricing.subtotal = this.items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    // حساب الضريبة (مثلاً 14%)
    this.pricing.tax = this.pricing.subtotal * 0.14;

    // حساب الإجمالي
    this.pricing.total =
      this.pricing.subtotal +
      this.pricing.deliveryFee +
      this.pricing.tax -
      this.pricing.discount.amount;
  }

  next();
});

// Pre-save middleware لتسجيل تغييرات الحالة
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

// Method لتأكيد الطلب
orderSchema.methods.confirm = async function (pharmacistId) {
  if (this.status !== "pending") {
    throw new Error("لا يمكن تأكيد هذا الطلب");
  }

  this.status = "confirmed";
  this.statusHistory.push({
    status: "confirmed",
    timestamp: new Date(),
    updatedBy: pharmacistId,
  });

  await this.save();
  return this;
};

// Method لإلغاء الطلب
orderSchema.methods.cancel = async function (cancelledBy, reason) {
  if (!this.canCancel) {
    throw new Error("لا يمكن إلغاء هذا الطلب");
  }

  this.status = "cancelled";
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();

  // إرجاع المخزون
  const Product = mongoose.model("Product");
  for (const item of this.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  // إذا كان الدفع تم، نسترجع المبلغ
  if (this.payment.status === "paid") {
    this.payment.status = "refunded";
    this.payment.refundedAt = new Date();
    this.payment.refundAmount = this.pricing.total;
    this.payment.refundReason = reason;
  }

  await this.save();
  return this;
};

// Method لتحديث حالة الطلب
orderSchema.methods.updateStatus = async function (newStatus, userId, note) {
  const validTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready-for-pickup", "cancelled"],
    "ready-for-pickup": ["out-for-delivery", "cancelled"],
    "out-for-delivery": ["delivered", "returned"],
    delivered: ["returned"],
  };

  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(`لا يمكن تغيير الحالة من ${this.status} إلى ${newStatus}`);
  }

  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: userId,
    note,
  });

  if (newStatus === "delivered") {
    this.delivery.actualDeliveryTime = new Date();
  }

  await this.save();
  return this;
};

// Method لطلب الإرجاع
orderSchema.methods.requestReturn = async function (reason) {
  if (!this.canReturn) {
    throw new Error("لا يمكن إرجاع هذا الطلب");
  }

  this.returnDetails = {
    reason,
    requestedAt: new Date(),
  };

  await this.save();
  return this;
};

// Static method للحصول على إحصائيات الطلبات
orderSchema.statics.getOrderStats = async function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalRevenue: { $sum: "$pricing.total" },
      },
    },
  ]);
};

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
