const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialty: {
      type: String,
      required: [true, "التخصص مطلوب"],
      enum: [
        "general",
        "pediatrics",
        "cardiology",
        "dermatology",
        "orthopedics",
        "neurology",
        "psychiatry",
        "gynecology",
        "ophthalmology",
        "ent",
        "dentistry",
        "other",
      ],
    },
    specialtyArabic: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "رقم الترخيص مطلوب"],
      unique: true,
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    experience: {
      type: Number,
      required: [true, "سنوات الخبرة مطلوبة"],
      min: [0, "سنوات الخبرة لا يمكن أن تكون سالبة"],
    },
    bio: {
      type: String,
      maxlength: [1000, "النبذة يجب ألا تتجاوز 1000 حرف"],
    },
    consultationFee: {
      type: Number,
      required: [true, "رسوم الاستشارة مطلوبة"],
      min: [0, "رسوم الاستشارة يجب أن تكون رقم موجب"],
    },
    availableTimes: [
      {
        day: {
          type: String,
          enum: [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ],
        },
        slots: [
          {
            startTime: String, // Format: "09:00"
            endTime: String, // Format: "10:00"
            isBooked: {
              type: Boolean,
              default: false,
            },
          },
        ],
      },
    ],
    consultationTypes: [
      {
        type: String,
        enum: ["chat", "video", "audio"],
      },
    ],
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
    totalConsultations: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    languages: [
      {
        type: String,
        enum: ["arabic", "english", "french"],
      },
    ],
    verificationDocuments: [
      {
        type: {
          type: String,
          enum: ["license", "certificate", "id"],
        },
        url: String,
        uploadedAt: Date,
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
// doctorSchema.index({ user: 1 });
doctorSchema.index({ specialty: 1 });
doctorSchema.index({ "rating.average": -1 });
doctorSchema.index({ isVerified: 1, isAvailable: 1 });

// Virtual للاستشارات
doctorSchema.virtual("consultations", {
  ref: "Consultation",
  localField: "_id",
  foreignField: "doctor",
});

// Virtual للمراجعات
doctorSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "doctor",
});

// Method لحساب التقييم
doctorSchema.methods.calculateRating = async function () {
  const Review = mongoose.model("Review");
  const stats = await Review.aggregate([
    { $match: { doctor: this._id } },
    {
      $group: {
        _id: "$doctor",
        avgRating: { $avg: "$rating" },
        numRatings: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.rating.average = Math.round(stats[0].avgRating * 10) / 10;
    this.rating.count = stats[0].numRatings;
  } else {
    this.rating.average = 0;
    this.rating.count = 0;
  }

  await this.save();
};

// Method للتحقق من التوفر في وقت معين
doctorSchema.methods.isAvailableAt = function (day, time) {
  const daySchedule = this.availableTimes.find((t) => t.day === day);
  if (!daySchedule) return false;

  const slot = daySchedule.slots.find((s) => {
    return s.startTime <= time && s.endTime > time && !s.isBooked;
  });

  return !!slot;
};

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
