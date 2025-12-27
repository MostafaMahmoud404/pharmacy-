const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, "كود الكوبون مطلوب"],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [3, "كود الكوبون يجب أن يكون 3 أحرف على الأقل"],
            maxlength: [20, "كود الكوبون يجب أن يكون أقل من 20 حرف"],
        },
        description: {
            type: String,
            required: [true, "وصف الكوبون مطلوب"],
            trim: true,
        },
        discountType: {
            type: String,
            enum: {
                values: ["percentage", "fixed"],
                message: "نوع الخصم يجب أن يكون: percentage أو fixed",
            },
            required: [true, "نوع الخصم مطلوب"],
        },
        discountValue: {
            type: Number,
            required: [true, "قيمة الخصم مطلوبة"],
            min: [0, "قيمة الخصم يجب أن تكون موجبة"],
            max: [100, "خصم النسبة المئوية يجب أن يكون أقل من أو يساوي 100%"],
        },
        minimumPurchase: {
            type: Number,
            default: 0,
            min: [0, "الحد الأدنى للشراء يجب أن يكون موجب"],
        },
        maximumDiscount: {
            type: Number,
            default: null, // null means no limit
        },
        usageLimit: {
            type: Number,
            default: null, // null means unlimited
            min: [1, "حد الاستخدام يجب أن يكون 1 على الأقل"],
        },
        usageCount: {
            type: Number,
            default: 0,
            min: [0, "عدد الاستخدامات يجب أن يكون موجب"],
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: [true, "تاريخ انتهاء الكوبون مطلوب"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        applicableProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
        ],
        applicableCategories: [
            {
                type: String,
                trim: true,
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, endDate: 1 });
couponSchema.index({ createdBy: 1 });

// Virtual for checking if coupon is expired
couponSchema.virtual("isExpired").get(function () {
    return new Date() > this.endDate;
});

// Virtual for checking if coupon is available
couponSchema.virtual("isAvailable").get(function () {
    return (
        this.isActive &&
        !this.isExpired &&
        (this.usageLimit === null || this.usageCount < this.usageLimit)
    );
});

// Pre-save middleware to update updatedAt
couponSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find active coupons
couponSchema.statics.findActive = function () {
    return this.find({
        isActive: true,
        endDate: { $gte: new Date() },
    });
};

// Instance method to check if coupon can be applied
couponSchema.methods.canApply = function (userId, purchaseAmount) {
    if (!this.isAvailable) return false;
    if (this.minimumPurchase > 0 && purchaseAmount < this.minimumPurchase)
        return false;

    // Check if user has already used this coupon (if we track per user)
    // This would require a separate collection for coupon usage

    return true;
};

module.exports = mongoose.model("Coupon", couponSchema);