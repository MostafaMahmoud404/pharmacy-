const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Order = require("../models/Order");
const Consultation = require("../models/Consultation");
const {
  asyncHandler,
  ErrorResponse,
  successResponse,
  APIFeatures,
  getPaginationData,
} = require("../middleware/errorHandler");
const {
  uploadSingle,
  deleteFile,
  getFileUrl,
} = require("../middleware/upload");



const getUsers = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(User.find(), req.query)
    .search(["name", "email", "phone"])
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;
  const total = await User.countDocuments(features.query.getFilter());

  const pagination = getPaginationData(req.query.page, req.query.limit, total);

  successResponse(
    res,
    200,
    "تم الحصول على المستخدمين بنجاح",
    { users },
    pagination
  );
});


const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate({
    path: "doctorProfile",
    select:
      "specialty specialtyArabic licenseNumber experience rating consultationFee isVerified",
  });

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

  let stats = {};

  if (user.role === "customer") {
    const ordersCount = await Order.countDocuments({ customer: user._id });
    const consultationsCount = await Consultation.countDocuments({
      patient: user._id,
    });

    stats = {
      totalOrders: ordersCount,
      totalConsultations: consultationsCount,
    };
  }

if (user.role === "doctor") {
  const consultationsCount = await Consultation.countDocuments({
    doctor: user._id,
  });
  const completedConsultations = await Consultation.countDocuments({
    doctor: user._id,
    status: "completed",
  });

  stats = {
    totalConsultations: consultationsCount,
    completedConsultations,
  };
}

successResponse(res, 200, "تم الحصول على المستخدم بنجاح", {
  user,
  stats,
});
});


const updateUser = asyncHandler(async (req, res, next) => {
  const { name, email, phone, role, isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
    if (emailExists) {
      return next(new ErrorResponse("البريد الإلكتروني مستخدم بالفعل", 400));
    }
    user.email = email;
  }

  if (phone && phone !== user.phone) {
    const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
    if (phoneExists) {
      return next(new ErrorResponse("رقم الهاتف مستخدم بالفعل", 400));
    }
    user.phone = phone;
  }

  if (name) user.name = name;
  if (role) user.role = role;
  if (typeof isActive === "boolean") user.isActive = isActive;

  await user.save();

  successResponse(res, 200, "تم تحديث المستخدم بنجاح", { user });
});


const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

  if (user.role === "admin") {
    return next(new ErrorResponse("لا يمكن حذف حساب المدير", 403));
  }

  if (user.role === "doctor") {
    await Doctor.findOneAndDelete({ user: user._id });
  }

  await user.deleteOne();

  successResponse(res, 200, "تم حذف المستخدم بنجاح");
});


const uploadProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("يرجى اختيار صورة", 400));
  }

  const user = await User.findById(req.user._id);

  // حذف الصورة القديمة إذا كانت موجودة
  if (user.profileImage && user.profileImage !== "default-avatar.png") {
    const fs = require("fs");
    const oldImagePath = user.profileImage;
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  // حفظ مسار الصورة الجديدة
  user.profileImage = req.file.path;
  await user.save();

  successResponse(res, 200, "تم رفع الصورة بنجاح", {
    profileImage: user.profileImage,
  });
});


const addAddress = asyncHandler(async (req, res, next) => {
  const { label, street, city, state, zipCode, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({
    label,
    street,
    city,
    state,
    zipCode,
    isDefault: isDefault || user.addresses.length === 0,
  });

  await user.save();

  successResponse(res, 201, "تم إضافة العنوان بنجاح", {
    addresses: user.addresses,
  });
});



const updateAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;
  const { label, street, city, state, zipCode, isDefault } = req.body;

  const user = await User.findById(req.user._id);
  const address = user.addresses.id(addressId);

  if (!address) {
    return next(new ErrorResponse("العنوان غير موجود", 404));
  }


  if (label) address.label = label;
  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (zipCode) address.zipCode = zipCode;


  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === addressId;
    });
  }

  await user.save();

  successResponse(res, 200, "تم تحديث العنوان بنجاح", {
    addresses: user.addresses,
  });
});



const deleteAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  const address = user.addresses.id(addressId);

  if (!address) {
    return next(new ErrorResponse("العنوان غير موجود", 404));
  }


  if (user.addresses.length === 1) {
    return next(
      new ErrorResponse("يجب أن يكون لديك عنوان واحد على الأقل", 400)
    );
  }


  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();

  successResponse(res, 200, "تم حذف العنوان بنجاح", {
    addresses: user.addresses,
  });
});



const getUserStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const customerCount = await User.countDocuments({ role: "customer" });
  const doctorCount = await User.countDocuments({ role: "doctor" });
  const pharmacistCount = await User.countDocuments({ role: "pharmacist" });
  const adminCount = await User.countDocuments({ role: "admin" });

  const activeUsers = await User.countDocuments({ isActive: true });
  const verifiedEmails = await User.countDocuments({ isEmailVerified: true });


  const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
  const availableDoctors = await Doctor.countDocuments({
    isAvailable: true,
    isVerified: true,
  });


  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  const stats = {
    total: totalUsers,
    byRole: {
      customers: customerCount,
      doctors: doctorCount,
      pharmacists: pharmacistCount,
      admins: adminCount,
    },
    active: activeUsers,
    verifiedEmails,
    doctors: {
      total: doctorCount,
      verified: verifiedDoctors,
      available: availableDoctors,
    },
    newUsersLast30Days: newUsers,
  };

  successResponse(res, 200, "تم الحصول على الإحصائيات بنجاح", { stats });
});



const searchUsers = asyncHandler(async (req, res, next) => {
  const { q, role } = req.query;

  if (!q || q.length < 2) {
    return next(new ErrorResponse("يجب أن يكون البحث حرفين على الأقل", 400));
  }

  const searchQuery = {
    $or: [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ],
  };

  if (role) {
    searchQuery.role = role;
  }

  const users = await User.find(searchQuery)
    .select("name email phone role profileImage isActive")
    .limit(20);

  successResponse(res, 200, "نتائج البحث", { users, count: users.length });
});



const getUserActivity = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("المستخدم غير موجود", 404));
  }

  let activity = {};

  if (user.role === "customer") {

    const recentOrders = await Order.find({ customer: user._id })
      .sort("-createdAt")
      .limit(5)
      .select("orderNumber status pricing.total createdAt");


      const recentConsultations = await Consultation.find({ patient: user._id })
      .sort("-createdAt")
      .limit(5)
      .populate("doctor", "user")
      .select("consultationNumber status scheduledTime");

    activity = {
      recentOrders,
      recentConsultations,
    };
  }

  if (user.role === "doctor") {
    const doctorProfile = await Doctor.findOne({ user: user._id });


    const recentConsultations = await Consultation.find({
      doctor: doctorProfile._id,
    })
      .sort("-createdAt")
      .limit(10)
      .populate("patient", "name profileImage")
      .select("consultationNumber status scheduledTime chiefComplaint");

    activity = {
      recentConsultations,
    };
  }

  successResponse(res, 200, "تم الحصول على النشاط بنجاح", { activity });
});

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfileImage,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserStats,
  searchUsers,
  getUserActivity,
};
