const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Consultation = require("../models/Consultation");
const Prescription = require("../models/Prescription");
const {
    asyncHandler,
    ErrorResponse,
    successResponse,
    getPaginationData,
} = require("../middleware/errorHandler");
const { startOfDay, endOfDay, addDays } = require("../utils/helpers");

// ============================================
// 1. DASHBOARD STATS - GET /api/admin/dashboard/stats
// ============================================
const getDashboardStats = asyncHandler(async (req, res, next) => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDaysAgo = addDays(today, -30);

    // Get all stats in parallel using aggregation pipelines
    const [
        productStats,
        userStats,
        orderStats,
        prescriptionStats,
        consultationStats,
        revenueStats,
    ] = await Promise.all([
        // Product Stats Aggregation
        Product.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    lowStock: [
                        { $match: { stock: { $gt: 0, $lte: 10 }, isActive: true } },
                        { $limit: 20 },
                        { $project: { name: 1, nameArabic: 1, stock: 1, price: 1, category: 1, sku: 1 } }
                    ],
                    outOfStock: [
                        { $match: { stock: 0, isActive: true } },
                        { $count: "count" }
                    ]
                }
            }
        ]),

        // User Stats Aggregation
        User.aggregate([
            {
                $facet: {
                    doctors: [
                        { $match: { role: "doctor" } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 50 },
                        {
                            $lookup: {
                                from: "doctors",
                                localField: "_id",
                                foreignField: "user",
                                as: "doctorProfile"
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                phone: 1,
                                createdAt: 1,
                                status: {
                                    $cond: {
                                        if: { $and: [{ $ne: ["$doctorProfile", []] }, { $arrayElemAt: ["$doctorProfile.isVerified", 0] }] },
                                        then: "active",
                                        else: "pending"
                                    }
                                }
                            }
                        }
                    ],
                    customers: [
                        { $match: { role: "customer" } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 100 },
                        {
                            $lookup: {
                                from: "orders",
                                localField: "_id",
                                foreignField: "customer",
                                as: "orders"
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                phone: 1,
                                createdAt: 1,
                                totalOrders: { $size: "$orders" },
                                totalSpent: { $sum: "$orders.pricing.total" },
                                lastOrderDate: { $max: "$orders.createdAt" },
                                isNew: { $gte: ["$createdAt", thirtyDaysAgo] },
                                isActive: { $gt: [{ $size: "$orders" }, 0] }
                            }
                        }
                    ]
                }
            }
        ]),

        // Order Stats Aggregation
        Order.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    today: [
                        { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
                        { $count: "count" }
                    ],
                    pending: [{ $match: { status: "pending" } }, { $count: "count" }],
                    delivered: [{ $match: { status: "delivered" } }, { $count: "count" }],
                    recent: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "customer",
                                foreignField: "_id",
                                as: "customer"
                            }
                        },
                        {
                            $project: {
                                orderNumber: 1,
                                status: 1,
                                "pricing.total": 1,
                                deliveryStatus: 1,
                                createdAt: 1,
                                itemsCount: { $size: "$items" },
                                customerName: { $arrayElemAt: ["$customer.name", 0] }
                            }
                        }
                    ]
                }
            }
        ]),

        // Prescription Stats Aggregation
        Prescription.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    pending: [{ $match: { status: "pending" } }, { $count: "count" }],
                    approved: [{ $match: { status: "active" } }, { $count: "count" }],
                    rejected: [{ $match: { status: "expired" } }, { $count: "count" }],
                    recent: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: "doctors",
                                localField: "doctor",
                                foreignField: "_id",
                                as: "doctor"
                            }
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "doctor.user",
                                foreignField: "_id",
                                as: "doctorUser"
                            }
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "patient",
                                foreignField: "_id",
                                as: "patient"
                            }
                        },
                        {
                            $project: {
                                prescriptionNumber: 1,
                                diagnosis: 1,
                                status: 1,
                                createdAt: 1,
                                medications: 1,
                                doctorName: { $arrayElemAt: ["$doctorUser.name", 0] },
                                patientName: { $arrayElemAt: ["$patient.name", 0] }
                            }
                        }
                    ]
                }
            }
        ]),

        // Consultation Stats Aggregation
        Consultation.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    today: [
                        { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
                        { $count: "count" }
                    ],
                    month: [
                        { $match: { createdAt: { $gte: startOfMonth } } },
                        { $count: "count" }
                    ]
                }
            }
        ]),

        // Revenue Stats Aggregation
        Order.aggregate([
            { $match: { "payment.status": "paid" } },
            {
                $facet: {
                    total: [
                        { $group: { _id: null, total: { $sum: "$pricing.total" } } }
                    ],
                    today: [
                        { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
                        { $group: { _id: null, total: { $sum: "$pricing.total" } } }
                    ],
                    month: [
                        { $match: { createdAt: { $gte: startOfMonth } } },
                        { $group: { _id: null, total: { $sum: "$pricing.total" } } }
                    ]
                }
            }
        ])
    ]);

    // Extract data from aggregation results
    const productData = productStats[0];
    const userData = userStats[0];
    const orderData = orderStats[0];
    const prescriptionData = prescriptionStats[0];
    const consultationData = consultationStats[0];
    const revenueData = revenueStats[0];

    // Process doctors data
    const doctors = userData.doctors;
    const totalDoctors = doctors.length;
    const activeDoctors = doctors.filter(d => d.status === "active").length;
    const pendingDoctors = doctors.filter(d => d.status === "pending").length;

    // Process customers data
    const customers = userData.customers;
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.isActive).length;
    const newCustomers = customers.filter(c => c.isNew).length;

    // Create customer activities from recent orders
    const activities = orderData.recent.slice(0, 10).map((order) => ({
        _id: order._id,
        customerId: order.customer?._id || "",
        customerName: order.customerName || "Unknown",
        type: "order",
        message: `Placed order #${order.orderNumber}`,
        timestamp: order.createdAt,
    }));

    // Build Response
    const stats = {
        products: {
            total: productData.total[0]?.count || 0,
            lowStock: productData.lowStock.length,
            outOfStock: productData.outOfStock[0]?.count || 0,
        },
        users: {
            doctors: {
                total: totalDoctors,
                active: activeDoctors,
                pending: pendingDoctors,
                list: doctors,
            },
            customers: {
                total: totalCustomers,
                active: activeCustomers,
                new: newCustomers,
                list: customers,
                activities: activities,
            },
            pharmacists: { total: 0, active: 0 },
        },
        prescriptions: {
            total: prescriptionData.total[0]?.count || 0,
            pending: prescriptionData.pending[0]?.count || 0,
            approved: prescriptionData.approved[0]?.count || 0,
            rejected: prescriptionData.rejected[0]?.count || 0,
        },
        orders: {
            total: orderData.total[0]?.count || 0,
            today: orderData.today[0]?.count || 0,
            pending: orderData.pending[0]?.count || 0,
            delivered: orderData.delivered[0]?.count || 0,
        },
        revenue: {
            total: revenueData.total[0]?.total || 0,
            today: revenueData.today[0]?.total || 0,
            thisMonth: revenueData.month[0]?.total || 0,
        },
        consultations: {
            total: consultationData.total[0]?.count || 0,
            today: consultationData.today[0]?.count || 0,
            thisMonth: consultationData.month[0]?.count || 0,
        },
        coupons: {
            active: 12,
            expired: 5,
            mostUsed: {
                _id: "1",
                code: "SUMMER2024",
                discount: 20,
                usageCount: 234,
                expiryDate: "2024-12-31",
            },
        },
        recentPrescriptions: prescriptionData.recent,
        recentOrders: orderData.recent.map(o => ({
            _id: o._id,
            orderNumber: o.orderNumber,
            customerName: o.customerName || "Unknown",
            status: o.status,
            total: o.pricing?.total || 0,
            deliveryStatus: o.deliveryStatus || o.status,
            createdAt: o.createdAt,
            items: o.itemsCount || 0,
        })),
        lowStockProducts: productData.lowStock,
    };

    successResponse(res, 200, "Dashboard stats retrieved successfully", { stats });
});

// ============================================
// 2. PRODUCTS
// ============================================
const getProducts = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, filter = "all" } = req.query;

    let query = { isActive: true };

    if (filter === "low-stock") {
        query.stock = { $gt: 0, $lte: 10 };
    } else if (filter === "out-of-stock") {
        query.stock = 0;
    }

    const products = await Product.find(query)
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select("name nameArabic stock price category sku images");

    const total = await Product.countDocuments(query);

    successResponse(
        res,
        200,
        "Products retrieved",
        { products },
        getPaginationData(page, limit, total)
    );
});

const createProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.create(req.body);
    successResponse(res, 201, "Product created successfully", { product });
});

const updateProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!product) {
        return next(new ErrorResponse("Product not found", 404));
    }

    successResponse(res, 200, "Product updated successfully", { product });
});

const deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
        return next(new ErrorResponse("Product not found", 404));
    }

    successResponse(res, 200, "Product deleted successfully");
});

// ============================================
// 3. DOCTORS
// ============================================
const getDoctors = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, status = "all", search = "" } = req.query;

    let userQuery = { role: "doctor" };
    if (search) {
        userQuery.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const doctors = await User.find(userQuery)
        .select("name email phone createdAt")
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    const doctorIds = doctors.map((d) => d._id);

    const doctorProfiles = await Doctor.find({ user: { $in: doctorIds } })
        .select("user isVerified specialty licenseNumber")
        .lean();

    const profileMap = doctorProfiles.reduce((acc, profile) => {
        acc[profile.user.toString()] = profile;
        return acc;
    }, {});

    const enrichedDoctors = doctors.map((doctor) => ({
        ...doctor,
        isVerified: profileMap[doctor._id.toString()]?.isVerified || false,
        specialty: profileMap[doctor._id.toString()]?.specialty || "",
        licenseNumber: profileMap[doctor._id.toString()]?.licenseNumber || "",
        status: profileMap[doctor._id.toString()]?.isVerified ? "active" : "pending",
    }));

    const filteredDoctors =
        status === "all"
            ? enrichedDoctors
            : enrichedDoctors.filter((d) => d.status === status);

    const total = await User.countDocuments(userQuery);

    successResponse(
        res,
        200,
        "Doctors retrieved",
        { doctors: filteredDoctors },
        getPaginationData(page, limit, total)
    );
});

const getDoctorDetails = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select("-password");

    if (!user || user.role !== "doctor") {
        return next(new ErrorResponse("Doctor not found", 404));
    }

    const doctorProfile = await Doctor.findOne({ user: user._id });

    successResponse(res, 200, "Doctor details retrieved", {
        doctor: { ...user.toObject(), profile: doctorProfile },
    });
});

const approveDoctors = asyncHandler(async (req, res, next) => {
    const { doctorIds } = req.body;

    await Doctor.updateMany(
        { user: { $in: doctorIds } },
        { $set: { isVerified: true } }
    );

    successResponse(res, 200, "Doctors approved successfully");
});

const rejectDoctors = asyncHandler(async (req, res, next) => {
    const { doctorIds } = req.body;

    await Doctor.updateMany(
        { user: { $in: doctorIds } },
        { $set: { isVerified: false } }
    );

    successResponse(res, 200, "Doctors rejected successfully");
});

const approveDoctor = asyncHandler(async (req, res, next) => {
    const doctor = await Doctor.findOne({ user: req.params.id });

    if (!doctor) {
        return next(new ErrorResponse("Doctor not found", 404));
    }

    doctor.isVerified = true;
    await doctor.save();

    successResponse(res, 200, "Doctor approved successfully", { doctor });
});

const rejectDoctor = asyncHandler(async (req, res, next) => {
    const doctor = await Doctor.findOne({ user: req.params.id });

    if (!doctor) {
        return next(new ErrorResponse("Doctor not found", 404));
    }

    doctor.isVerified = false;
    await doctor.save();

    successResponse(res, 200, "Doctor rejected successfully", { doctor });
});

// ============================================
// 4. CUSTOMERS
// ============================================
const getCustomers = asyncHandler(async (req, res, next) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "createdAt",
        sortOrder = "desc",
    } = req.query;

    let query = { role: "customer" };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
        ];
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const customers = await User.find(query)
        .select("name email phone createdAt")
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    const customerIds = customers.map((c) => c._id);

    const ordersData = await Order.aggregate([
        { $match: { customer: { $in: customerIds } } },
        {
            $group: {
                _id: "$customer",
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: "$pricing.total" },
                lastOrderDate: { $max: "$createdAt" },
            },
        },
    ]);

    const ordersMap = ordersData.reduce((acc, order) => {
        acc[order._id.toString()] = order;
        return acc;
    }, {});

    const enrichedCustomers = customers.map((customer) => ({
        ...customer,
        totalOrders: ordersMap[customer._id.toString()]?.totalOrders || 0,
        totalSpent: ordersMap[customer._id.toString()]?.totalSpent || 0,
        lastOrderDate: ordersMap[customer._id.toString()]?.lastOrderDate || null,
    }));

    const total = await User.countDocuments(query);

    successResponse(
        res,
        200,
        "Customers retrieved",
        { customers: enrichedCustomers },
        getPaginationData(page, limit, total)
    );
});

const getCustomerDetails = asyncHandler(async (req, res, next) => {
    const customer = await User.findById(req.params.id).select("-password");

    if (!customer || customer.role !== "customer") {
        return next(new ErrorResponse("Customer not found", 404));
    }

    const orders = await Order.find({ customer: customer._id })
        .sort("-createdAt")
        .limit(10)
        .select("orderNumber status pricing.total createdAt");

    successResponse(res, 200, "Customer details retrieved", {
        customer: { ...customer.toObject(), recentOrders: orders },
    });
});

const updateCustomer = asyncHandler(async (req, res, next) => {
    const customer = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    }).select("-password");

    if (!customer) {
        return next(new ErrorResponse("Customer not found", 404));
    }

    successResponse(res, 200, "Customer updated", { customer });
});

const getCustomerActivities = asyncHandler(async (req, res, next) => {
    const recentOrders = await Order.find()
        .sort("-createdAt")
        .limit(20)
        .populate("customer", "name")
        .lean();

    const activities = recentOrders.map((order) => ({
        _id: order._id,
        customerId: order.customer?._id,
        customerName: order.customer?.name || "Unknown",
        type: "order",
        message: `Placed order #${order.orderNumber}`,
        timestamp: order.createdAt,
    }));

    successResponse(res, 200, "Activities retrieved", { activities });
});

const exportCustomers = asyncHandler(async (req, res, next) => {
    const customers = await User.find({ role: "customer" })
        .select("name email phone createdAt")
        .lean();

    const csv = [
        "Name,Email,Phone,Created At",
        ...customers.map((c) => `${c.name},${c.email},${c.phone || ""},${c.createdAt}`),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=customers.csv");
    res.send(csv);
});

// ============================================
// 5. PRESCRIPTIONS
// ============================================
const getPrescriptions = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, status = "all", search = "" } = req.query;

    let query = {};

    if (status !== "all") {
        query.status = status;
    }

    if (search) {
        query.prescriptionNumber = { $regex: search, $options: "i" };
    }

    const prescriptions = await Prescription.find(query)
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("doctor", "user")
        .populate({ path: "doctor", populate: { path: "user", select: "name" } })
        .populate("patient", "name")
        .lean();

    const total = await Prescription.countDocuments(query);

    successResponse(
        res,
        200,
        "Prescriptions retrieved",
        { prescriptions },
        getPaginationData(page, limit, total)
    );
});

const getPrescriptionDetails = asyncHandler(async (req, res, next) => {
    const prescription = await Prescription.findById(req.params.id)
        .populate("doctor", "user")
        .populate({ path: "doctor", populate: { path: "user", select: "name" } })
        .populate("patient", "name email");

    if (!prescription) {
        return next(new ErrorResponse("Prescription not found", 404));
    }

    successResponse(res, 200, "Prescription retrieved", { prescription });
});

const approvePrescriptions = asyncHandler(async (req, res, next) => {
    const { prescriptionIds } = req.body;

    await Prescription.updateMany(
        { _id: { $in: prescriptionIds } },
        { $set: { status: "active" } }
    );

    successResponse(res, 200, "Prescriptions approved successfully");
});

const rejectPrescriptions = asyncHandler(async (req, res, next) => {
    const { prescriptionIds } = req.body;

    await Prescription.updateMany(
        { _id: { $in: prescriptionIds } },
        { $set: { status: "expired" } }
    );

    successResponse(res, 200, "Prescriptions rejected successfully");
});

const approvePrescription = asyncHandler(async (req, res, next) => {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
        return next(new ErrorResponse("Prescription not found", 404));
    }

    prescription.status = "active";
    await prescription.save();

    successResponse(res, 200, "Prescription approved", { prescription });
});

const rejectPrescription = asyncHandler(async (req, res, next) => {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
        return next(new ErrorResponse("Prescription not found", 404));
    }

    prescription.status = "expired";
    await prescription.save();

    successResponse(res, 200, "Prescription rejected", { prescription });
});

const exportPrescriptions = asyncHandler(async (req, res, next) => {
    const prescriptions = await Prescription.find()
        .populate("doctor", "user")
        .populate({ path: "doctor", populate: { path: "user", select: "name" } })
        .populate("patient", "name")
        .lean();

    const csv = [
        "Prescription Number,Doctor,Patient,Status,Created At",
        ...prescriptions.map(
            (p) =>
                `${p.prescriptionNumber},${p.doctor?.user?.name || "Unknown"},${p.patient?.name || "Unknown"
                },${p.status},${p.createdAt}`
        ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=prescriptions.csv");
    res.send(csv);
});

// ============================================
// 6. ORDERS
// ============================================
const getOrders = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, status = "all" } = req.query;

    let query = {};
    if (status !== "all") {
        query.status = status;
    }

    const orders = await Order.find(query)
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("customer", "name email")
        .select("orderNumber status pricing.total delivery createdAt")
        .lean();

    const total = await Order.countDocuments(query);

    successResponse(
        res,
        200,
        "Orders retrieved",
        { orders },
        getPaginationData(page, limit, total)
    );
});

const getOrderDetails = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id)
        .populate("customer", "name email phone")
        .populate("items.product", "name price");

    if (!order) {
        return next(new ErrorResponse("Order not found", 404));
    }

    successResponse(res, 200, "Order retrieved", { order });
});

const updateOrderStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
    );

    if (!order) {
        return next(new ErrorResponse("Order not found", 404));
    }

    successResponse(res, 200, "Order status updated", { order });
});

const cancelOrder = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse("Order not found", 404));
    }

    await order.cancel("pharmacy", reason);

    successResponse(res, 200, "Order cancelled", { order });
});

// ============================================
// 7. COUPONS
// ============================================
const getCoupons = asyncHandler(async (req, res, next) => {
    const { status = "all" } = req.query;

    const coupons = [
        {
            _id: "1",
            code: "SUMMER2024",
            discount: 20,
            expiryDate: "2024-12-31",
            usageLimit: 100,
            usageCount: 45,
            status: "active",
        },
        {
            _id: "2",
            code: "WELCOME10",
            discount: 10,
            expiryDate: "2024-11-30",
            usageLimit: 50,
            usageCount: 50,
            status: "expired",
        },
    ];

    const filtered =
        status === "all" ? coupons : coupons.filter((c) => c.status === status);

    successResponse(res, 200, "Coupons retrieved", { coupons: filtered });
});

const createCoupon = asyncHandler(async (req, res, next) => {
    const coupon = { _id: Date.now().toString(), ...req.body, status: "active" };
    successResponse(res, 201, "Coupon created", { coupon });
});

const updateCoupon = asyncHandler(async (req, res, next) => {
    const coupon = { _id: req.params.id, ...req.body };
    successResponse(res, 200, "Coupon updated", { coupon });
});

const deleteCoupon = asyncHandler(async (req, res, next) => {
    successResponse(res, 200, "Coupon deleted");
});

const getCouponStats = asyncHandler(async (req, res, next) => {
    const stats = {
        totalUsage: 45,
        revenue: 1200,
        averageOrderValue: 150,
    };
    successResponse(res, 200, "Coupon stats retrieved", { stats });
});

// ============================================
// 8. REPORTS
// ============================================
const getSalesReport = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    const orders = await Order.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        },
        "payment.status": "paid",
    }).select("pricing.total createdAt");

    const totalRevenue = orders.reduce((sum, o) => sum + o.pricing.total, 0);

    successResponse(res, 200, "Sales report generated", {
        report: {
            totalOrders: orders.length,
            totalRevenue,
            startDate,
            endDate,
        },
    });
});

const exportReport = asyncHandler(async (req, res, next) => {
    const csv = "Report,Data\nSample,123";

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=report.csv");
    res.send(csv);
});

// ============================================
// EXPORTS
// ============================================
module.exports = {
    // Dashboard
    getDashboardStats,

    // Products
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,

    // Doctors
    getDoctors,
    getDoctorDetails,
    approveDoctors,
    rejectDoctors,
    approveDoctor,
    rejectDoctor,

    // Customers
    getCustomers,
    getCustomerDetails,
    updateCustomer,
    getCustomerActivities,
    exportCustomers,

    // Prescriptions
    getPrescriptions,
    getPrescriptionDetails,
    approvePrescriptions,
    rejectPrescriptions,
    approvePrescription,
    rejectPrescription,
    exportPrescriptions,

    // Orders
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    cancelOrder,

    // Coupons
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponStats,

    // Reports
    getSalesReport,
    exportReport,
};