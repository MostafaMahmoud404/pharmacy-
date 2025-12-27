const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    permissions: {
        type: [String],
        default: ["manage_users", "manage_products", "manage_orders", "manage_doctors", "manage_prescriptions"],
    },
    isSuperAdmin: {
        type: Boolean,
        default: false,
    },
    lastLogin: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt field before saving
adminSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("Admin", adminSchema);