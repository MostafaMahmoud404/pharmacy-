const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "الكمية يجب أن تكون 1 على الأقل"],
        default: 1,
    },
    price: {
        type: Number,
        required: true,
    },
    // حفظ snapshot من المنتج وقت الإضافة
    name: String,
    image: String,
});

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // كل user له cart واحدة فقط
        },
        items: [cartItemSchema],
        // Optional: حفظ آخر تحديث
        lastModified: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index للبحث السريع
// cartSchema.index({ user: 1 });

// Virtual: حساب إجمالي العناصر
cartSchema.virtual("totalItems").get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual: حساب المجموع الفرعي
cartSchema.virtual("subtotal").get(function () {
    return this.items.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);
});

// Pre-save middleware: تحديث lastModified
cartSchema.pre("save", function (next) {
    this.lastModified = new Date();
    next();
});

// Method: إضافة منتج للسلة
cartSchema.methods.addItem = async function (product, quantity = 1) {
    const existingItem = this.items.find(
        (item) => item.product.toString() === product._id.toString()
    );

    if (existingItem) {
        // زيادة الكمية
        existingItem.quantity += quantity;
    } else {
        // إضافة منتج جديد
        this.items.push({
            product: product._id,
            quantity,
            price: product.discountPrice || product.price,
            name: product.name,
            image: product.images?.find((img) => img.isMain)?.url || product.images?.[0]?.url,
        });
    }

    await this.save();
    return this;
};

// Method: تحديث كمية منتج
cartSchema.methods.updateItemQuantity = async function (productId, quantity) {
    const item = this.items.find(
        (item) => item.product.toString() === productId.toString()
    );

    if (!item) {
        throw new Error("المنتج غير موجود في السلة");
    }

    if (quantity <= 0) {
        // حذف المنتج
        this.items = this.items.filter(
            (item) => item.product.toString() !== productId.toString()
        );
    } else {
        item.quantity = quantity;
    }

    await this.save();
    return this;
};

// Method: حذف منتج من السلة
cartSchema.methods.removeItem = async function (productId) {
    this.items = this.items.filter(
        (item) => item.product.toString() !== productId.toString()
    );

    await this.save();
    return this;
};

// Method: مسح السلة بالكامل
cartSchema.methods.clearCart = async function () {
    this.items = [];
    await this.save();
    return this;
};

// Static method: الحصول على سلة المستخدم (أو إنشاؤها)
cartSchema.statics.getOrCreateCart = async function (userId) {
    let cart = await this.findOne({ user: userId }).populate({
        path: "items.product",
        select: "name nameArabic price discountPrice stock images isActive",
    });

    if (!cart) {
        cart = await this.create({ user: userId, items: [] });
        await cart.populate({
            path: "items.product",
            select: "name nameArabic price discountPrice stock images isActive",
        });
    }

    return cart;
};

// Static method: حذف السلات القديمة (أكثر من 30 يوم بدون تعديل)
cartSchema.statics.cleanupOldCarts = async function () {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.deleteMany({
        lastModified: { $lt: thirtyDaysAgo },
        items: { $size: 0 }, // فقط السلات الفارغة
    });

    return result.deletedCount;
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
