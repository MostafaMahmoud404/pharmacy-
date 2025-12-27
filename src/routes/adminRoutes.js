const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/roleCheck");

const {
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
} = require("../controllers/adminController");

// Protect all routes - Admin only
router.use(protect);
router.use(authorize("admin"));

// ============================================
// DASHBOARD ROUTES
// ============================================
router.get("/dashboard/stats", getDashboardStats);

// ============================================
// PRODUCTS ROUTES
// ============================================
router.route("/products")
    .get(getProducts)
    .post(createProduct);

router.route("/products/:id")
    .put(updateProduct)
    .delete(deleteProduct);

// ============================================
// DOCTORS ROUTES
// ============================================
router.get("/doctors", getDoctors);
router.get("/doctors/:id", getDoctorDetails);
router.post("/doctors/bulk-approve", approveDoctors);
router.post("/doctors/bulk-reject", rejectDoctors);
router.put("/doctors/:id/approve", approveDoctor);
router.put("/doctors/:id/reject", rejectDoctor);

// ============================================
// CUSTOMERS ROUTES
// ============================================
router.get("/customers", getCustomers);
router.get("/customers/:id", getCustomerDetails);
router.put("/customers/:id", updateCustomer);
router.get("/customers/:id/activities", getCustomerActivities);
router.get("/customers/export", exportCustomers);

// ============================================
// PRESCRIPTIONS ROUTES
// ============================================
router.get("/prescriptions", getPrescriptions);
router.get("/prescriptions/:id", getPrescriptionDetails);
router.post("/prescriptions/bulk-approve", approvePrescriptions);
router.post("/prescriptions/bulk-reject", rejectPrescriptions);
router.put("/prescriptions/:id/approve", approvePrescription);
router.put("/prescriptions/:id/reject", rejectPrescription);
router.get("/prescriptions/export", exportPrescriptions);

// ============================================
// ORDERS ROUTES
// ============================================
router.get("/orders", getOrders);
router.get("/orders/:id", getOrderDetails);
router.put("/orders/:id/status", updateOrderStatus);
router.put("/orders/:id/cancel", cancelOrder);

// ============================================
// COUPONS ROUTES
// ============================================
router.route("/coupons")
    .get(getCoupons)
    .post(createCoupon);
router.route("/coupons/:id")
    .put(updateCoupon)
    .delete(deleteCoupon);
router.get("/coupons/:id/stats", getCouponStats);

// ============================================
// REPORTS ROUTES
// ============================================
router.get("/reports/sales", getSalesReport);
router.get("/reports/export", exportReport);

module.exports = router;