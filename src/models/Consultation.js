const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    consultationNumber: {
      type: String,
      unique: true,
      // لا نضع required هنا لأن الـ Controller يولده يدوياً
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "الطبيب مطلوب"],
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "المريض مطلوب"],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ["chat", "video", "audio"],
        message: "نوع الاستشارة يجب أن يكون chat أو video أو audio",
      },
      required: [true, "نوع الاستشارة مطلوب"],
    },
    scheduledTime: {
      type: Date,
      required: [true, "وقت الاستشارة مطلوب"],
      index: true,
    },
    duration: {
      type: Number,
      default: 30,
      min: [15, "مدة الاستشارة يجب أن تكون 15 دقيقة على الأقل"],
      max: [120, "مدة الاستشارة يجب ألا تتجاوز 120 دقيقة"],
    },
    actualStartTime: {
      type: Date,
    },
    actualEndTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: [
          "pending",
          "confirmed",
          "in-progress",
          "completed",
          "cancelled",
          "no-show",
        ],
        message: "حالة الاستشارة غير صحيحة",
      },
      default: "pending",
      index: true,
    },
    cancelledBy: {
      type: String,
      enum: {
        values: ["doctor", "patient", "system"],
        message: "قيمة cancelledBy غير صحيحة",
      },
    },
    cancellationReason: {
      type: String,
      maxlength: [500, "سبب الإلغاء يجب ألا يتجاوز 500 حرف"],
    },
    cancelledAt: {
      type: Date,
    },
    chiefComplaint: {
      type: String,
      required: [true, "السبب الرئيسي للاستشارة مطلوب"],
      maxlength: [500, "السبب الرئيسي يجب ألا يتجاوز 500 حرف"],
      trim: true,
    },
    symptoms: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        duration: {
          type: String,
          trim: true,
        },
        severity: {
          type: String,
          enum: {
            values: ["mild", "moderate", "severe"],
            message: "شدة العرض يجب أن تكون mild أو moderate أو severe",
          },
        },
      },
    ],
    medicalHistory: {
      chronicDiseases: [
        {
          type: String,
          trim: true,
        },
      ],
      allergies: [
        {
          type: String,
          trim: true,
        },
      ],
      currentMedications: [
        {
          name: {
            type: String,
            trim: true,
          },
          dosage: {
            type: String,
            trim: true,
          },
          frequency: {
            type: String,
            trim: true,
          },
        },
      ],
      surgeries: [
        {
          name: {
            type: String,
            trim: true,
          },
          date: Date,
        },
      ],
      familyHistory: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    vitalSigns: {
      bloodPressure: {
        type: String,
        trim: true,
      },
      heartRate: {
        type: Number,
        min: [30, "معدل نبضات القلب يجب أن يكون 30 على الأقل"],
        max: [220, "معدل نبضات القلب يجب ألا يتجاوز 220"],
      },
      temperature: {
        type: Number,
        min: [35, "درجة الحرارة يجب أن تكون 35 على الأقل"],
        max: [43, "درجة الحرارة يجب ألا تتجاوز 43"],
      },
      weight: {
        type: Number,
        min: [0, "الوزن يجب أن يكون قيمة موجبة"],
      },
      height: {
        type: Number,
        min: [0, "الطول يجب أن يكون قيمة موجبة"],
      },
    },
    doctorNotes: {
      type: String,
      maxlength: [2000, "ملاحظات الطبيب يجب ألا تتجاوز 2000 حرف"],
      trim: true,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    followUpNotes: {
      type: String,
      maxlength: [500, "ملاحظات المتابعة يجب ألا تتجاوز 500 حرف"],
      trim: true,
    },
    chatMessages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        senderType: {
          type: String,
          enum: {
            values: ["doctor", "patient"],
            message: "نوع المرسل يجب أن يكون doctor أو patient",
          },
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
          index: true,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        attachments: [
          {
            type: {
              type: String,
              enum: ["image", "document", "report"],
            },
            url: String,
          },
        ],
      },
    ],
    videoCallDetails: {
      roomId: {
        type: String,
        trim: true,
      },
      recordingUrl: {
        type: String,
        trim: true,
      },
      duration: {
        type: Number,
        min: 0,
      },
    },
    payment: {
      amount: {
        type: Number,
        required: [true, "مبلغ الاستشارة مطلوب"],
        min: [0, "المبلغ يجب أن يكون قيمة موجبة"],
      },
      status: {
        type: String,
        enum: {
          values: ["pending", "paid", "refunded", "failed"],
          message: "حالة الدفع غير صحيحة",
        },
        default: "pending",
        index: true,
      },
      method: {
        type: String,
        enum: {
          values: ["cash", "card", "wallet", "insurance"],
          message: "طريقة الدفع غير صحيحة",
        },
      },
      transactionId: {
        type: String,
        trim: true,
      },
      paidAt: Date,
      refundedAt: Date,
      refundReason: {
        type: String,
        trim: true,
      },
    },
    rating: {
      score: {
        type: Number,
        min: [1, "التقييم يجب أن يكون 1 على الأقل"],
        max: [5, "التقييم يجب ألا يتجاوز 5"],
      },
      comment: {
        type: String,
        maxlength: [500, "تعليق التقييم يجب ألا يتجاوز 500 حرف"],
        trim: true,
      },
      ratedAt: Date,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: {
            values: ["image", "document", "report"],
            message: "نوع المرفق غير صحيح",
          },
        },
        url: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
          trim: true,
        },
        uploadedBy: {
          type: String,
          enum: {
            values: ["doctor", "patient"],
            message: "قيمة uploadedBy غير صحيحة",
          },
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
          enum: {
            values: ["sms", "email", "push"],
            message: "نوع التذكير غير صحيح",
          },
        },
        sentAt: Date,
        status: {
          type: String,
          enum: {
            values: ["sent", "failed"],
            message: "حالة التذكير غير صحيحة",
          },
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

// ==================== Indexes ====================
// consultationSchema.index({ consultationNumber: 1 }, { unique: true });
consultationSchema.index({ doctor: 1, scheduledTime: -1 });
consultationSchema.index({ patient: 1, scheduledTime: -1 });
consultationSchema.index({ status: 1, scheduledTime: 1 });
// consultationSchema.index({ "payment.status": 1 });
consultationSchema.index({ createdAt: -1 });

// Compound index للبحث عن الاستشارات المتاحة
consultationSchema.index({
  doctor: 1,
  scheduledTime: 1,
  status: 1,
});

// ==================== Virtuals ====================

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

  // يمكن البدء قبل الموعد بـ 10 دقائق وحتى 30 دقيقة بعد الموعد
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

// Virtual للحصول على آخر رسالة
consultationSchema.virtual("lastMessage").get(function () {
  if (this.chatMessages && this.chatMessages.length > 0) {
    return this.chatMessages[this.chatMessages.length - 1];
  }
  return null;
});

// Virtual للتحقق من إمكانية الإلغاء
consultationSchema.virtual("canCancel").get(function () {
  return !["completed", "cancelled"].includes(this.status);
});

// Virtual للتحقق من إمكانية التقييم
consultationSchema.virtual("canRate").get(function () {
  return this.status === "completed" && !this.rating?.score;
});

// ==================== Pre-save Middleware ====================

// التأكد من وجود consultationNumber عند الحفظ (Fallback)
consultationSchema.pre("save", async function (next) {
  // فقط إذا كان document جديد ومافيش consultationNumber
  if (this.isNew && !this.consultationNumber) {
    console.warn(
      "⚠️ consultationNumber not provided, generating fallback number"
    );

    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      // محاولة إيجاد آخر رقم استشارة لهذا الشهر
      const lastConsultation = await mongoose
        .model("Consultation")
        .findOne({
          consultationNumber: new RegExp(`^CS${year}${month}`),
        })
        .sort({ consultationNumber: -1 })
        .select("consultationNumber")
        .lean();

      let sequenceNumber = 1;

      if (lastConsultation && lastConsultation.consultationNumber) {
        const lastNumber = parseInt(
          lastConsultation.consultationNumber.slice(-6)
        );
        sequenceNumber = lastNumber + 1;
      }

      this.consultationNumber = `CS${year}${month}${String(
        sequenceNumber
      ).padStart(6, "0")}`;

      console.log("✅ Generated fallback consultation number:", this.consultationNumber);
    } catch (error) {
      console.error("❌ Error generating consultation number:", error);
      // استخدام timestamp + random كـ fallback أخير
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      this.consultationNumber = `CS${timestamp}${random}`;
    }
  }
  next();
});

// التحقق من صحة البيانات قبل الحفظ
consultationSchema.pre("save", function (next) {
  // التحقق من أن actualEndTime بعد actualStartTime
  if (this.actualStartTime && this.actualEndTime) {
    if (this.actualEndTime < this.actualStartTime) {
      return next(new Error("وقت الانتهاء يجب أن يكون بعد وقت البدء"));
    }
  }

  // التحقق من أن followUpDate في المستقبل
  if (this.followUpRequired && this.followUpDate) {
    if (this.followUpDate < new Date()) {
      return next(new Error("تاريخ المتابعة يجب أن يكون في المستقبل"));
    }
  }

  next();
});

// ==================== Instance Methods ====================

// Method لبدء الاستشارة
consultationSchema.methods.start = async function () {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledTime);
  const timeDiff = (scheduledTime - now) / 60000;

  if (this.status !== "confirmed") {
    throw new Error("الاستشارة يجب أن تكون مؤكدة");
  }

  if (this.payment.status !== "paid") {
    throw new Error("لم يتم تأكيد الدفع");
  }

  if (timeDiff > 10) {
    throw new Error("لا يمكن البدء قبل الموعد بأكثر من 10 دقائق");
  }

  if (timeDiff < -30) {
    throw new Error("تم تجاوز وقت بدء الاستشارة");
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
  try {
    const Doctor = mongoose.model("Doctor");
    const doctor = await Doctor.findById(this.doctor);

    if (doctor && doctor.totalConsultations !== undefined) {
      await Doctor.findByIdAndUpdate(this.doctor, {
        $inc: { totalConsultations: 1 },
      });
    }
  } catch (error) {
    console.error("Error updating doctor consultations count:", error.message);
  }

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
  let hasUnread = false;

  this.chatMessages.forEach((msg) => {
    if (msg.senderType !== userType && !msg.isRead) {
      msg.isRead = true;
      hasUnread = true;
    }
  });

  if (hasUnread) {
    await this.save();
  }

  return hasUnread;
};

// Method لإضافة مرفق
consultationSchema.methods.addAttachment = async function (
  type,
  url,
  filename,
  uploadedBy
) {
  this.attachments.push({
    type,
    url,
    filename,
    uploadedBy,
    uploadedAt: new Date(),
  });

  await this.save();

  return this.attachments[this.attachments.length - 1];
};

// ==================== Static Methods ====================

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
  })
    .sort({ scheduledTime: 1 })
    .populate("patient", "name phone profileImage");
};

// Static method للحصول على الاستشارات النشطة
consultationSchema.statics.getActiveConsultations = function (doctorId) {
  return this.find({
    doctor: doctorId,
    status: "in-progress",
  })
    .sort({ actualStartTime: -1 })
    .populate("patient", "name phone profileImage");
};

// Static method للحصول على إحصائيات الطبيب
consultationSchema.statics.getDoctorStats = async function (doctorId) {
  const stats = await this.aggregate([
    {
      $match: { doctor: mongoose.Types.ObjectId(doctorId) },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = await this.aggregate([
    {
      $match: {
        doctor: mongoose.Types.ObjectId(doctorId),
        "payment.status": "paid",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$payment.amount" },
      },
    },
  ]);

  return {
    statusDistribution: stats,
    totalRevenue: totalRevenue[0]?.total || 0,
  };
};

// Static method للحصول على الاستشارات المتأخرة
consultationSchema.statics.getOverdueConsultations = function () {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  return this.find({
    scheduledTime: { $lt: thirtyMinutesAgo },
    status: { $in: ["pending", "confirmed"] },
  }).populate("doctor patient", "name phone");
};

// ==================== Query Helpers ====================

// Helper للبحث حسب الحالة
consultationSchema.query.byStatus = function (status) {
  return this.where({ status });
};

// Helper للبحث حسب الطبيب
consultationSchema.query.byDoctor = function (doctorId) {
  return this.where({ doctor: doctorId });
};

// Helper للبحث حسب المريض
consultationSchema.query.byPatient = function (patientId) {
  return this.where({ patient: patientId });
};

// Helper للبحث حسب النوع
consultationSchema.query.byType = function (type) {
  return this.where({ type });
};

// Helper للبحث في فترة زمنية
consultationSchema.query.betweenDates = function (startDate, endDate) {
  return this.where({
    scheduledTime: { $gte: startDate, $lte: endDate },
  });
};

// ==================== Post Hooks ====================

// تسجيل عملية الحفظ
consultationSchema.post("save", function (doc) {
  console.log(`✅ Consultation ${doc.consultationNumber} saved successfully`);
});

// معالجة الأخطاء
consultationSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("رقم الاستشارة موجود مسبقاً"));
  } else {
    next(error);
  }
});

// ==================== Model Creation ====================

const Consultation = mongoose.model("Consultation", consultationSchema);

module.exports = Consultation;