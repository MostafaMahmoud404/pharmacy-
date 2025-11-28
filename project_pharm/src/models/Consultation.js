const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    consultationNumber: {
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
    type: {
      type: String,
      enum: ["chat", "video", "audio"],
      required: [true, "نوع الاستشارة مطلوب"],
    },
    scheduledTime: {
      type: Date,
      required: [true, "وقت الاستشارة مطلوب"],
    },
    duration: {
      type: Number, // بالدقائق
      default: 30,
    },
    actualStartTime: Date,
    actualEndTime: Date,
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
        "no-show",
      ],
      default: "pending",
    },
    cancelledBy: {
      type: String,
      enum: ["doctor", "patient", "system"],
    },
    cancellationReason: String,
    cancelledAt: Date,
    chiefComplaint: {
      type: String,
      required: [true, "السبب الرئيسي للاستشارة مطلوب"],
      maxlength: [500, "السبب الرئيسي يجب ألا يتجاوز 500 حرف"],
    },
    symptoms: [
      {
        name: String,
        duration: String,
        severity: {
          type: String,
          enum: ["mild", "moderate", "severe"],
        },
      },
    ],
    medicalHistory: {
      chronicDiseases: [String],
      allergies: [String],
      currentMedications: [
        {
          name: String,
          dosage: String,
          frequency: String,
        },
      ],
      surgeries: [
        {
          name: String,
          date: Date,
        },
      ],
      familyHistory: [String],
    },
    vitalSigns: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
    },
    doctorNotes: {
      type: String,
      maxlength: [2000, "ملاحظات الطبيب يجب ألا تتجاوز 2000 حرف"],
    },
    diagnosis: String,
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: Date,
    followUpNotes: String,
    chatMessages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        senderType: {
          type: String,
          enum: ["doctor", "patient"],
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        attachments: [
          {
            type: String,
            url: String,
          },
        ],
      },
    ],
    videoCallDetails: {
      roomId: String,
      recordingUrl: String,
      duration: Number,
    },
    payment: {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "refunded", "failed"],
        default: "pending",
      },
      method: {
        type: String,
        enum: ["cash", "card", "wallet", "insurance"],
      },
      transactionId: String,
      paidAt: Date,
      refundedAt: Date,
      refundReason: String,
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
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "document", "report"],
        },
        url: String,
        filename: String,
        uploadedBy: {
          type: String,
          enum: ["doctor", "patient"],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reminders: [
      {
        type: {
          type: String,
          enum: ["sms", "email", "push"],
        },
        sentAt: Date,
        status: {
          type: String,
          enum: ["sent", "failed"],
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
consultationSchema.index({ consultationNumber: 1 });
consultationSchema.index({ doctor: 1, scheduledTime: -1 });
consultationSchema.index({ patient: 1, scheduledTime: -1 });
consultationSchema.index({ status: 1, scheduledTime: 1 });
consultationSchema.index({ "payment.status": 1 });

// Virtual لحساب المدة الفعلية
consultationSchema.virtual("actualDuration").get(function () {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime - this.actualStartTime) / 60000); // بالدقائق
  }
  return 0;
});

// Virtual للتحقق من إمكانية البدء
consultationSchema.virtual("canStart").get(function () {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledTime);
  const timeDiff = (scheduledTime - now) / 60000; // بالدقائق

  // يمكن البدء قبل الموعد بـ 10 دقائق
  return (
    this.status === "confirmed" &&
    this.payment.status === "paid" &&
    timeDiff <= 10 &&
    timeDiff >= -30
  );
});

// Virtual لعدد الرسائل غير المقروءة
consultationSchema.virtual("unreadMessagesCount").get(function () {
  return this.chatMessages.filter((msg) => !msg.isRead).length;
});

// Pre-save middleware لتوليد رقم الاستشارة
consultationSchema.pre("save", async function (next) {
  if (!this.consultationNumber) {
    const count = await mongoose.model("Consultation").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    this.consultationNumber = `CS${year}${month}${String(count + 1).padStart(
      6,
      "0"
    )}`;
  }
  next();
});

// Method لبدء الاستشارة
consultationSchema.methods.start = async function () {
  if (!this.canStart) {
    throw new Error("لا يمكن بدء الاستشارة في هذا الوقت");
  }

  this.status = "in-progress";
  this.actualStartTime = new Date();
  await this.save();

  return this;
};

// Method لإنهاء الاستشارة
consultationSchema.methods.complete = async function (doctorNotes, diagnosis) {
  if (this.status !== "in-progress") {
    throw new Error("الاستشارة يجب أن تكون قيد التنفيذ");
  }

  this.status = "completed";
  this.actualEndTime = new Date();
  this.doctorNotes = doctorNotes;
  this.diagnosis = diagnosis;

  await this.save();

  // تحديث عدد الاستشارات للطبيب
  const Doctor = mongoose.model("Doctor");
  await Doctor.findByIdAndUpdate(this.doctor, {
    $inc: { totalConsultations: 1 },
  });

  return this;
};

// Method للإلغاء
consultationSchema.methods.cancel = async function (cancelledBy, reason) {
  if (["completed", "cancelled"].includes(this.status)) {
    throw new Error("لا يمكن إلغاء هذه الاستشارة");
  }

  this.status = "cancelled";
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();

  // إذا تم الإلغاء قبل 24 ساعة، يمكن استرجاع المبلغ
  const hoursUntilScheduled =
    (this.scheduledTime - new Date()) / (1000 * 60 * 60);
  if (hoursUntilScheduled > 24 && this.payment.status === "paid") {
    this.payment.status = "refunded";
    this.payment.refundedAt = new Date();
    this.payment.refundReason = "Cancellation before 24 hours";
  }

  await this.save();

  return this;
};

// Method لإضافة رسالة في الشات
consultationSchema.methods.addMessage = async function (
  senderId,
  senderType,
  message,
  attachments = []
) {
  this.chatMessages.push({
    sender: senderId,
    senderType,
    message,
    attachments,
    timestamp: new Date(),
    isRead: false,
  });

  await this.save();

  return this.chatMessages[this.chatMessages.length - 1];
};

// Method لوضع علامة قراءة على الرسائل
consultationSchema.methods.markMessagesAsRead = async function (userType) {
  this.chatMessages.forEach((msg) => {
    if (msg.senderType !== userType) {
      msg.isRead = true;
    }
  });

  await this.save();
};

// Static method للحصول على الاستشارات القادمة
consultationSchema.statics.getUpcomingConsultations = function (
  doctorId,
  hours = 24
) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return this.find({
    doctor: doctorId,
    scheduledTime: { $gte: now, $lte: futureTime },
    status: { $in: ["confirmed", "pending"] },
  }).sort({ scheduledTime: 1 });
};

const Consultation = mongoose.model("Consultation", consultationSchema);

module.exports = Consultation;
