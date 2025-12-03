const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    deliveryNumber: {
      type: String,
      unique: true,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    deliveryPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    pickupLocation: {
      name: {
        type: String,
        default: "الصيدلية الرئيسية",
      },
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      phone: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      instructions: String,
    },
    status: {
      type: String,
      enum: [
        "pending", // في انتظار التعيين
        "assigned", // تم التعيين لمندوب
        "picked-up", // تم الاستلام من الصيدلية
        "in-transit", // في الطريق
        "near-location", // قريب من الموقع
        "delivered", // تم التسليم
        "failed", // فشل التوصيل
        "returned", // تم الإرجاع
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
        location: {
          latitude: Number,
          longitude: Number,
        },
        note: String,
      },
    ],
    timeline: {
      assignedAt: Date,
      pickedUpAt: Date,
      inTransitAt: Date,
      arrivedAt: Date,
      deliveredAt: Date,
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },
    deliveryType: {
      type: String,
      enum: ["standard", "express", "same-day"],
      default: "standard",
    },
    tracking: {
      currentLocation: {
        latitude: Number,
        longitude: Number,
        updatedAt: Date,
      },
      routeHistory: [
        {
          latitude: Number,
          longitude: Number,
          timestamp: {
            type: Date,
            default: Date.now,
          },
          speed: Number,
          accuracy: Number,
        },
      ],
      distance: {
        total: Number, // المسافة الكلية بالكيلومتر
        remaining: Number, // المسافة المتبقية
      },
      eta: Date, // الوقت المتوقع للوصول
    },
    deliveryAttempts: [
      {
        attemptNumber: Number,
        timestamp: Date,
        status: {
          type: String,
          enum: ["customer-not-available", "wrong-address", "refused", "other"],
        },
        note: String,
        nextAttemptScheduled: Date,
      },
    ],
    proofOfDelivery: {
      signature: String, // توقيع العميل (base64)
      photo: String, // صورة التوصيل
      recipientName: String, // اسم المستلم
      recipientPhone: String, // رقم المستلم
      deliveredAt: Date,
      notes: String,
    },
    failureReason: {
      type: String,
      enum: [
        "customer-unavailable",
        "wrong-address",
        "customer-cancelled",
        "weather-conditions",
        "vehicle-issue",
        "other",
      ],
    },
    failureNote: String,
    returnReason: String,
    returnedAt: Date,
    contactAttempts: [
      {
        method: {
          type: String,
          enum: ["phone", "sms", "app"],
        },
        timestamp: Date,
        successful: Boolean,
        note: String,
      },
    ],
    customerRating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
      ratedAt: Date,
    },
    deliveryFee: {
      base: Number,
      surge: Number, // رسوم إضافية في أوقات الذروة
      distance: Number, // رسوم المسافة
      total: Number,
    },
    notes: String,
    internalNotes: String, // ملاحظات داخلية للفريق فقط
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// deliverySchema.index({ deliveryNumber: 1 });
// deliverySchema.index({ order: 1 });
deliverySchema.index({ deliveryPerson: 1, status: 1 });
deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ estimatedDeliveryTime: 1 });

// Virtual لحساب إجمالي رسوم التوصيل
deliverySchema.virtual("totalDeliveryFee").get(function () {
  if (!this.deliveryFee) return 0;
  return (
    (this.deliveryFee.base || 0) +
    (this.deliveryFee.surge || 0) +
    (this.deliveryFee.distance || 0)
  );
});

// Virtual للتحقق من التأخير
deliverySchema.virtual("isDelayed").get(function () {
  if (!this.estimatedDeliveryTime || this.status === "delivered") return false;
  return new Date() > this.estimatedDeliveryTime;
});

// Virtual لحساب وقت التوصيل الفعلي
deliverySchema.virtual("deliveryDuration").get(function () {
  if (!this.timeline.pickedUpAt || !this.actualDeliveryTime) return null;

  const duration = (this.actualDeliveryTime - this.timeline.pickedUpAt) / 60000; // بالدقائق
  return Math.round(duration);
});

// Virtual لعدد محاولات التوصيل
deliverySchema.virtual("attemptCount").get(function () {
  return this.deliveryAttempts?.length || 0;
});

// Pre-save middleware لتوليد رقم التوصيل
deliverySchema.pre("save", async function (next) {
  if (!this.deliveryNumber) {
    const count = await mongoose.model("Delivery").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    this.deliveryNumber = `DLV${year}${month}${String(count + 1).padStart(
      6,
      "0"
    )}`;
  }
  next();
});

// Pre-save middleware لتسجيل تغييرات الحالة
deliverySchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });

    // تحديث الجدول الزمني
    switch (this.status) {
      case "assigned":
        this.timeline.assignedAt = new Date();
        break;
      case "picked-up":
        this.timeline.pickedUpAt = new Date();
        break;
      case "in-transit":
        this.timeline.inTransitAt = new Date();
        break;
      case "near-location":
        this.timeline.arrivedAt = new Date();
        break;
      case "delivered":
        this.timeline.deliveredAt = new Date();
        this.actualDeliveryTime = new Date();
        break;
    }
  }
  next();
});

// Method لتعيين مندوب التوصيل
deliverySchema.methods.assignDriver = async function (driverId) {
  if (this.status !== "pending") {
    throw new Error("لا يمكن تعيين مندوب لهذه الشحنة");
  }

  this.deliveryPerson = driverId;
  this.status = "assigned";
  this.timeline.assignedAt = new Date();

  await this.save();
  return this;
};

// Method لتحديث الموقع
deliverySchema.methods.updateLocation = async function (
  latitude,
  longitude,
  speed = null
) {
  this.tracking.currentLocation = {
    latitude,
    longitude,
    updatedAt: new Date(),
  };

  this.tracking.routeHistory.push({
    latitude,
    longitude,
    timestamp: new Date(),
    speed,
    accuracy: null,
  });

  // حساب المسافة المتبقية (يحتاج API خارجي في الواقع)
  // هنا مثال بسيط
  if (this.deliveryAddress.coordinates) {
    const distance = this.calculateDistance(
      latitude,
      longitude,
      this.deliveryAddress.coordinates.latitude,
      this.deliveryAddress.coordinates.longitude
    );
    this.tracking.distance.remaining = distance;

    // تحديث ETA بناءً على السرعة (سرعة متوسطة 40 كم/س)
    const avgSpeed = speed || 40;
    const hoursRemaining = distance / avgSpeed;
    this.tracking.eta = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);

    // إذا كان قريب (أقل من 500 متر)
    if (distance < 0.5 && this.status === "in-transit") {
      this.status = "near-location";
    }
  }

  await this.save();
  return this;
};

// Method لحساب المسافة بين نقطتين (Haversine formula)
deliverySchema.methods.calculateDistance = function (lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Method لتسجيل محاولة توصيل فاشلة
deliverySchema.methods.recordFailedAttempt = async function (
  reason,
  note,
  nextAttempt = null
) {
  const attemptNumber = this.deliveryAttempts.length + 1;

  this.deliveryAttempts.push({
    attemptNumber,
    timestamp: new Date(),
    status: reason,
    note,
    nextAttemptScheduled: nextAttempt,
  });

  // إذا كانت المحاولة الثالثة، ضع حالة فشل
  if (attemptNumber >= 3) {
    this.status = "failed";
    this.failureReason = reason;
    this.failureNote = note;
  }

  await this.save();
  return this;
};

// Method لتأكيد التوصيل
deliverySchema.methods.confirmDelivery = async function (proofData) {
  if (this.status !== "near-location" && this.status !== "in-transit") {
    throw new Error("لا يمكن تأكيد التوصيل في هذه الحالة");
  }

  this.status = "delivered";
  this.proofOfDelivery = {
    ...proofData,
    deliveredAt: new Date(),
  };
  this.actualDeliveryTime = new Date();

  await this.save();

  // تحديث حالة الطلب
  const Order = mongoose.model("Order");
  await Order.findByIdAndUpdate(this.order, {
    status: "delivered",
    "delivery.actualDeliveryTime": new Date(),
  });

  return this;
};

// Method لتسجيل محاولة اتصال
deliverySchema.methods.recordContactAttempt = async function (
  method,
  successful,
  note
) {
  this.contactAttempts.push({
    method,
    timestamp: new Date(),
    successful,
    note,
  });

  await this.save();
  return this;
};

// Static method للحصول على الشحنات النشطة لمندوب
deliverySchema.statics.getActiveDeliveriesForDriver = function (driverId) {
  return this.find({
    deliveryPerson: driverId,
    status: { $in: ["assigned", "picked-up", "in-transit", "near-location"] },
  })
    .populate("order")
    .sort({ priority: -1, estimatedDeliveryTime: 1 });
};

// Static method للحصول على الشحنات المتأخرة
deliverySchema.statics.getDelayedDeliveries = function () {
  return this.find({
    estimatedDeliveryTime: { $lt: new Date() },
    status: { $in: ["assigned", "picked-up", "in-transit", "near-location"] },
  })
    .populate("order")
    .populate("deliveryPerson", "name phone");
};

// Static method لإحصائيات التوصيل
deliverySchema.statics.getDeliveryStats = async function (
  startDate,
  endDate,
  driverId = null
) {
  const match = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (driverId) {
    match.deliveryPerson = driverId;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgDuration: { $avg: "$deliveryDuration" },
      },
    },
  ]);
};

const Delivery = mongoose.model("Delivery", deliverySchema);

module.exports = Delivery;
