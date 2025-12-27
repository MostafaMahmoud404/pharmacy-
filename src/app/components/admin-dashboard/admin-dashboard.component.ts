import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService } from '../../services/admin.service';

// ============================================
// Interfaces
// ============================================

interface Product {
  _id: string;
  name: string;
  nameArabic: string;
  stock: number;
  price: number;
  category: string;
  sku?: string;
  images?: string[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'doctor' | 'customer' | 'pharmacist';
  status: string;
  createdAt: string;
  isVerified?: boolean;
  specialty?: string;
  licenseNumber?: string;
}

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  status: 'active' | 'inactive' | 'blocked';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  isOnline?: boolean;
  isVIP?: boolean;
  isNew?: boolean;
  isActive?: boolean;
  notes?: string;
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    language: 'en' | 'ar';
  };
}

interface CustomerActivity {
  _id: string;
  customerId: string;
  customerName: string;
  type: 'order' | 'login' | 'profile_update' | 'contact' | 'review';
  message: string;
  timestamp: string;
  metadata?: any;
}

interface Prescription {
  _id: string;
  prescriptionNumber: string;
  doctorName: string;
  patientName: string;
  status: string;
  createdAt: string;
  medications?: string[];
  diagnosis?: string;
  doctor?: any;
  patient?: any;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  deliveryStatus: string;
  createdAt: string;
  items?: any[];
  itemsCount?: number;
  pricing?: {
    total: number;
    subtotal?: number;
    tax?: number;
    shipping?: number;
  };
  customer?: any;
  delivery?: any;
  shippingAddress?: string;
}

interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  discount: number;
  usageCount: number;
  expiryDate: string;
  isActive?: boolean;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  status?: string;
  stats?: any;
}

interface DashboardStats {
  products: { total: number; lowStock: number; outOfStock: number };
  users: {
    doctors: { total: number; active: number; pending: number; list: User[] };
    customers: { total: number; active: number; new: number; list: Customer[]; activities: CustomerActivity[] };
    pharmacists: { total: number; active: number };
  };
  prescriptions: { total: number; pending: number; approved: number; rejected: number };
  orders: { total: number; today: number; pending: number; delivered: number };
  revenue: { total: number; today: number; thisMonth: number };
  consultations: { total: number; today: number; thisMonth: number };
  coupons: { active: number; expired: number; mostUsed: Coupon | null };
  recentPrescriptions: Prescription[];
  recentOrders: Order[];
  lowStockProducts: Product[];
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  // ============================================
  // Main Properties
  // ============================================

  stats: DashboardStats = {
    products: { total: 0, lowStock: 0, outOfStock: 0 },
    users: {
      doctors: { total: 0, active: 0, pending: 0, list: [] },
      customers: { total: 0, active: 0, new: 0, list: [], activities: [] },
      pharmacists: { total: 0, active: 0 }
    },
    prescriptions: { total: 0, pending: 0, approved: 0, rejected: 0 },
    orders: { total: 0, today: 0, pending: 0, delivered: 0 },
    revenue: { total: 0, today: 0, thisMonth: 0 },
    consultations: { total: 0, today: 0, thisMonth: 0 },
    coupons: { active: 0, expired: 0, mostUsed: null },
    recentPrescriptions: [],
    recentOrders: [],
    lowStockProducts: []
  };

  isLoading = true;
  isRefreshing = false;
  isSaving = false;
  notificationCount = 0;
  activeMenu = 'home';
  Math = Math;
  errorMessage = '';
  successMessage = '';

  // ============================================
  // Data Properties for Dynamic Loading
  // ============================================

  allProducts: Product[] = [];
  productsLoading = false;
  productsError = '';

  doctors: User[] = [];
  doctorsLoading = false;
  doctorsError = '';

  customers: Customer[] = [];
  customerActivities: CustomerActivity[] = [];
  customersLoading = false;
  customersError = '';

  prescriptions: Prescription[] = [];
  prescriptionsLoading = false;
  prescriptionsError = '';

  orders: Order[] = [];
  ordersLoading = false;
  ordersError = '';

  coupons: Coupon[] = [];
  couponsLoading = false;
  couponsError = '';

  lowStockLoading = false;
  lowStockError = '';

  activePage: 'dashboard' | 'products' | 'add-product' | 'orders' | 'doctors' | 'customers' | 'prescriptions' | 'reports' | 'coupons' | 'settings' = 'dashboard';

  sidebarItems: { id: 'dashboard' | 'products' | 'add-product' | 'doctors' | 'customers' | 'prescriptions' | 'orders' | 'reports' | 'coupons' | 'settings'; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'products', label: 'Products', icon: '💊' },
    { id: 'doctors', label: 'Doctors', icon: '👨‍⚕️' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'prescriptions', label: 'Prescriptions', icon: '📋' },
    { id: 'orders', label: 'Orders & Delivery', icon: '🚚' },
    { id: 'reports', label: 'Sales Reports', icon: '📊' },
    { id: 'coupons', label: 'Coupons & Offers', icon: '🎫' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  // ============================================
  // Filters
  // ============================================

  selectedProductFilter: string = 'all';
  selectedDoctorFilter: string = 'all';
  selectedOrderFilter: string = 'all';
  selectedPrescriptionTab: string = 'pending';
  selectedCouponFilter: string = 'all';

  // ============================================
  // New Product Form
  // ============================================

  newProduct: any = {
    name: '',
    nameArabic: '',
    category: '',
    price: 0,
    stock: 0
  };

  isEditingProduct: boolean = false;
  editingProductId: string = '';

  productCategories = [
    'Pain Relief',
    'Antibiotics',
    'Vitamins',
    'Diabetes',
    'Allergy',
    'Cold & Flu',
    'Gastro',
    'Heart',
    'Other'
  ];

  // ============================================
  // Doctor Management Properties
  // ============================================

  doctorSearchTerm: string = '';
  doctorsPerPage: number = 10;
  currentDoctorsPage: number = 1;
  selectedDoctors: string[] = [];
  doctorsSortBy: 'name' | 'date' | 'status' = 'date';
  doctorsSortOrder: 'asc' | 'desc' = 'desc';

  // ============================================
  // Customer Management Properties
  // ============================================

  customerSearchTerm: string = '';
  customersPerPage: number = 10;
  currentCustomersPage: number = 1;
  customersSortBy: 'name' | 'date' | 'totalSpent' = 'date';
  customersSortOrder: 'asc' | 'desc' = 'desc';

  // ============================================
  // Prescription Management Properties
  // ============================================

  prescriptionSearchTerm: string = '';
  prescriptionsPerPage: number = 10;
  currentPrescriptionsPage: number = 1;
  selectedPrescriptions: string[] = [];
  prescriptionsSortBy: 'date' | 'doctor' | 'status' = 'date';
  prescriptionsSortOrder: 'asc' | 'desc' = 'desc';
  showPrescriptionModal: boolean = false;
  selectedPrescriptionDetails: any = null;

  showDoctorModal: boolean = false;
  selectedDoctorDetails: any = null;

  showCustomerModal: boolean = false;
  selectedCustomerDetails: any = null;
  isEditingCustomer: boolean = false;

  // ============================================
  // Order Management Properties
  // ============================================

  orderSearchTerm: string = '';
  ordersPerPage: number = 10;
  currentOrdersPage: number = 1;
  ordersSortBy: 'date' | 'customer' | 'status' | 'total' = 'date';
  ordersSortOrder: 'asc' | 'desc' = 'desc';
  showOrderModal: boolean = false;
  selectedOrderDetails: any = null;
  isUpdatingOrder: boolean = false;

  // ============================================
  // Coupon Management Properties
  // ============================================

  couponSearchTerm: string = '';
  couponsPerPage: number = 10;
  currentCouponsPage: number = 1;
  couponsSortBy: 'code' | 'discount' | 'usage' | 'expiry' = 'code';
  couponsSortOrder: 'asc' | 'desc' = 'asc';
  showCouponModal: boolean = false;
  selectedCouponDetails: any = null;
  isEditingCoupon: boolean = false;
  newCoupon: any = {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minimumPurchase: 0,
    maximumDiscount: 0,
    usageLimit: 0,
    expiryDate: '',
    isActive: true
  };

  // ============================================
  // Private Properties
  // ============================================

  private destroy$ = new Subject<void>();
  private refreshInterval: any;
  private searchSubject$ = new Subject<string>();

  // ============================================
  // Constructor
  // ============================================

  constructor(
    private router: Router,
    private adminService: AdminService
  ) { }

  // ============================================
  // Lifecycle Hooks
  // ============================================

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupAutoRefresh();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // ============================================
  // Setup Functions
  // ============================================

  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentCustomersPage = 1;
        this.currentPrescriptionsPage = 1;
        this.currentDoctorsPage = 1;
        this.currentOrdersPage = 1;
        this.currentCouponsPage = 1;
      });
  }

  private setupAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshDashboard();
    }, 5 * 60 * 1000);
  }

  // ============================================
  // Data Loading Functions
  // ============================================

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats = response.data.stats || response.data;

            // تنسيق البيانات
            this.formatDashboardData();

            this.calculateNotifications();
            this.loadAllData();
          } else {
            this.errorMessage = response.message || 'Failed to load dashboard data';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard:', error);
          this.errorMessage = 'Failed to load dashboard data. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private formatDashboardData(): void {
    // تنسيق بيانات الأطباء
    if (this.stats.users?.doctors?.list) {
      this.doctors = this.stats.users.doctors.list;
    }

    // تنسيق بيانات العملاء
    if (this.stats.users?.customers?.list) {
      this.customers = this.stats.users.customers.list.map(customer => ({
        ...customer,
        customerId: customer._id || customer.customerId || `CUST${Math.random().toString().substring(2, 8)}`,
        status: (customer.status || 'active') as 'active' | 'inactive' | 'blocked',
        isVIP: customer.isVIP || customer.totalSpent > 1000,
        isOnline: customer.isOnline || false
      }));
    }

    // تنسيق بيانات الطلبات
    if (this.stats.recentOrders) {
      this.orders = this.stats.recentOrders.map(order => ({
        ...order,
        total: order.pricing?.total || order.total || 0,
        deliveryStatus: order.deliveryStatus || order.status || 'pending',
        customerName: order.customerName || order.customer?.name || 'Unknown'
      }));
    }

    // تنسيق بيانات الوصفات
    if (this.stats.recentPrescriptions) {
      this.prescriptions = this.stats.recentPrescriptions.map(prescription => ({
        ...prescription,
        doctorName: prescription.doctorName || prescription.doctor?.user?.name || 'Unknown',
        patientName: prescription.patientName || prescription.patient?.name || 'Unknown'
      }));
    }

    // تنسيق المنتجات منخفضة المخزون
    if (this.stats.lowStockProducts) {
      this.allProducts = this.stats.lowStockProducts;
    }

    // تنسيق الأنشطة
    if (this.stats.users?.customers?.activities) {
      this.customerActivities = this.stats.users.customers.activities;
    }
  }

  private loadAllData(): void {
    forkJoin({
      products: this.adminService.getProducts(1, 100, 'all'),
      doctors: this.adminService.getDoctors(1, 100, 'all', ''),
      customers: this.adminService.getCustomers(1, 100, '', 'date', 'desc'),
      customerActivities: this.adminService.getCustomerActivities(),
      prescriptions: this.adminService.getPrescriptions(1, 100, 'all', ''),
      orders: this.adminService.getOrders(1, 100, 'all'),
      coupons: this.adminService.getCoupons('all'),
      lowStock: this.adminService.getProducts(1, 100, 'low-stock')
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          if (results.products?.success) {
            this.allProducts = results.products.data.products || [];
          }

          if (results.doctors?.success) {
            this.doctors = (results.doctors.data.doctors || []).map((doctor: any) => ({
              ...doctor,
              status: doctor.status || (doctor.isVerified ? 'active' : 'pending')
            }));
            if (this.stats.users?.doctors) {
              this.stats.users.doctors.list = this.doctors;
            }
          }

          if (results.customers?.success) {
            this.customers = (results.customers.data.customers || []).map((customer: any) => ({
              ...customer,
              customerId: customer.customerId || customer._id || `CUST${Math.random().toString().substring(2, 8)}`,
              status: (customer.status || 'active') as 'active' | 'inactive' | 'blocked',
              totalOrders: customer.totalOrders || 0,
              totalSpent: customer.totalSpent || 0,
              isVIP: customer.isVIP || customer.totalSpent > 1000,
              isOnline: customer.isOnline || false
            }));
            if (this.stats.users?.customers) {
              this.stats.users.customers.list = this.customers;
            }
          }

          if (results.customerActivities?.success) {
            this.customerActivities = results.customerActivities.data.activities || [];
            if (this.stats.users?.customers) {
              this.stats.users.customers.activities = this.customerActivities;
            }
          }

          if (results.prescriptions?.success) {
            this.prescriptions = (results.prescriptions.data.prescriptions || []).map((p: any) => ({
              ...p,
              doctorName: p.doctorName || p.doctor?.user?.name || 'Unknown',
              patientName: p.patientName || p.patient?.name || 'Unknown'
            }));
            this.stats.recentPrescriptions = this.prescriptions.slice(0, 10);
          }

          if (results.orders?.success) {
            this.orders = (results.orders.data.orders || []).map((order: any) => ({
              ...order,
              total: order.pricing?.total || order.total || 0,
              deliveryStatus: order.deliveryStatus || order.delivery?.status || order.status || 'pending',
              customerName: order.customerName || order.customer?.name || 'Unknown',
              items: order.itemsCount || order.items?.length || 0
            }));
            this.stats.recentOrders = this.orders.slice(0, 10);
          }

          if (results.coupons?.success) {
            this.coupons = results.coupons.data.coupons || [];
          }

          if (results.lowStock?.success) {
            this.stats.lowStockProducts = results.lowStock.data.products || [];
          }
        },
        error: (error) => console.error('Error loading data:', error)
      });
  }

  refreshDashboard(): void {
    this.isRefreshing = true;
    this.loadDashboardData();
    setTimeout(() => this.isRefreshing = false, 500);
  }

  // ============================================
  // Data Loading Methods
  // ============================================

  loadProducts(): void {
    this.productsLoading = true;
    this.productsError = '';
    this.adminService.getProducts(1, 100, this.selectedProductFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.allProducts = response.data.products || [];
            this.showSuccess('Products loaded');
          } else {
            this.productsError = response.message || 'Failed to load products';
          }
          this.productsLoading = false;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.productsError = 'Failed to load products. Please try again.';
          this.productsLoading = false;
        }
      });
  }

  loadDoctors(): void {
    this.doctorsLoading = true;
    this.doctorsError = '';
    this.adminService.getDoctors(1, 100, this.selectedDoctorFilter, this.doctorSearchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.doctors = (response.data.doctors || []).map((doctor: any) => ({
              ...doctor,
              status: doctor.status || (doctor.isVerified ? 'active' : 'pending')
            }));
          } else {
            this.doctorsError = response.message || 'Failed to load doctors';
          }
          this.doctorsLoading = false;
        },
        error: (error) => {
          console.error('Error loading doctors:', error);
          this.doctorsError = 'Failed to load doctors. Please try again.';
          this.doctorsLoading = false;
        }
      });
  }

  loadCustomers(): void {
    this.customersLoading = true;
    this.customersError = '';
    this.adminService.getCustomers(1, 100, this.customerSearchTerm, this.customersSortBy, this.customersSortOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.customers = (response.data.customers || []).map((customer: any) => ({
              ...customer,
              customerId: customer.customerId || customer._id || `CUST${Math.random().toString().substring(2, 8)}`,
              status: (customer.status || 'active') as 'active' | 'inactive' | 'blocked',
              totalOrders: customer.totalOrders || 0,
              totalSpent: customer.totalSpent || 0,
              isVIP: customer.isVIP || customer.totalSpent > 1000,
              isOnline: customer.isOnline || false
            }));
            this.showSuccess('Customers loaded');
          } else {
            this.customersError = response.message || 'Failed to load customers';
          }
          this.customersLoading = false;
        },
        error: (error) => {
          console.error('Error loading customers:', error);
          this.customersError = 'Failed to load customers. Please try again.';
          this.customersLoading = false;
        }
      });

    this.adminService.getCustomerActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.customerActivities = response.data.activities || [];
          }
        },
        error: (error) => {
          console.error('Error loading customer activities:', error);
        }
      });
  }

  loadPrescriptions(): void {
    this.prescriptionsLoading = true;
    this.prescriptionsError = '';
    this.adminService.getPrescriptions(1, 100, this.selectedPrescriptionTab, this.prescriptionSearchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.prescriptions = (response.data.prescriptions || []).map((p: any) => ({
              ...p,
              doctorName: p.doctorName || p.doctor?.user?.name || 'Unknown',
              patientName: p.patientName || p.patient?.name || 'Unknown'
            }));
            this.showSuccess('Prescriptions loaded');
          } else {
            this.prescriptionsError = response.message || 'Failed to load prescriptions';
          }
          this.prescriptionsLoading = false;
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
          this.prescriptionsError = 'Failed to load prescriptions. Please try again.';
          this.prescriptionsLoading = false;
        }
      });
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.ordersError = '';
    this.adminService.getOrders(1, 100, this.selectedOrderFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.orders = (response.data.orders || []).map((order: any) => ({
              ...order,
              total: order.pricing?.total || order.total || 0,
              deliveryStatus: order.deliveryStatus || order.delivery?.status || order.status || 'pending',
              customerName: order.customerName || order.customer?.name || 'Unknown',
              items: order.itemsCount || order.items?.length || 0
            }));
            this.showSuccess('Orders loaded');
          } else {
            this.ordersError = response.message || 'Failed to load orders';
          }
          this.ordersLoading = false;
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.ordersError = 'Failed to load orders. Please try again.';
          this.ordersLoading = false;
        }
      });
  }

  loadCoupons(): void {
    this.couponsLoading = true;
    this.couponsError = '';
    this.adminService.getCoupons(this.selectedCouponFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.coupons = response.data.coupons || [];
            this.showSuccess('Coupons loaded');
          } else {
            this.couponsError = response.message || 'Failed to load coupons';
          }
          this.couponsLoading = false;
        },
        error: (error) => {
          console.error('Error loading coupons:', error);
          this.couponsError = 'Failed to load coupons. Please try again.';
          this.couponsLoading = false;
        }
      });
  }

  loadLowStockProducts(): void {
    this.lowStockLoading = true;
    this.lowStockError = '';
    this.adminService.getProducts(1, 100, 'low-stock')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats.lowStockProducts = response.data.products || [];
            this.showSuccess('Low-stock products loaded');
          } else {
            this.lowStockError = response.message || 'Failed to load low-stock products';
          }
          this.lowStockLoading = false;
        },
        error: (error) => {
          console.error('Error loading low-stock products:', error);
          this.lowStockError = 'Failed to load low-stock products. Please try again.';
          this.lowStockLoading = false;
        }
      });
  }

  private calculateNotifications(): void {
    this.notificationCount =
      (this.stats.prescriptions?.pending || 0) +
      (this.stats.orders?.pending || 0) +
      (this.stats.products?.outOfStock || 0) +
      (this.stats.users?.doctors?.pending || 0);
  }

  // ============================================
  // Search Functions
  // ============================================

  searchCustomers(): void {
    this.searchSubject$.next(this.customerSearchTerm);
    this.loadCustomers();
  }

  searchPrescriptions(): void {
    this.searchSubject$.next(this.prescriptionSearchTerm);
    this.loadPrescriptions();
  }

  searchOrders(): void {
    this.searchSubject$.next(this.orderSearchTerm);
    this.loadOrders();
  }

  searchCoupons(): void {
    this.searchSubject$.next(this.couponSearchTerm);
  }

  // ============================================
  // Pagination Functions
  // ============================================

  getPagesArray(): number[] {
    const totalPages = this.getTotalCustomersPages();
    const maxPagesToShow = 5;
    const pages = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfWay = Math.ceil(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentCustomersPage - halfWay);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  getPrescriptionPagesArray(): number[] {
    const totalPages = this.getTotalPrescriptionsPages();
    const maxPagesToShow = 5;
    const pages = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfWay = Math.ceil(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPrescriptionsPage - halfWay);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  goToPage(page: number): void {
    this.currentCustomersPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToPrescriptionPage(page: number): void {
    this.currentPrescriptionsPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================
  // Formatting Functions
  // ============================================

  formatCurrency(value: number): string {
    if (!value || value === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatDate(dateString);
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      pending: 'pending',
      approved: 'confirmed',
      active: 'confirmed',
      rejected: 'cancelled',
      delivered: 'delivered',
      processing: 'preparing',
      confirmed: 'confirmed',
      preparing: 'preparing',
      ready: 'ready',
      cancelled: 'cancelled',
      shipped: 'preparing',
      'out-for-delivery': 'preparing'
    };
    return `status-badge ${statusClasses[status.toLowerCase()] || 'pending'}`;
  }

  // ============================================
  // Customer Management Functions
  // ============================================

  getFilteredCustomers(): Customer[] {
    let customers = this.customers;

    if (this.customerSearchTerm.trim()) {
      const term = this.customerSearchTerm.toLowerCase();
      customers = customers.filter(customer =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        (customer.customerId && customer.customerId.toLowerCase().includes(term))
      );
    }

    return customers;
  }

  getSortedCustomers(): Customer[] {
    const customers = this.getFilteredCustomers();

    return customers.sort((a, b) => {
      let comparison = 0;

      switch (this.customersSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'totalSpent':
          comparison = a.totalSpent - b.totalSpent;
          break;
      }

      return this.customersSortOrder === 'asc' ? comparison : -comparison;
    });
  }

  getPaginatedCustomers(): Customer[] {
    const customers = this.getSortedCustomers();
    const start = (this.currentCustomersPage - 1) * this.customersPerPage;
    const end = start + this.customersPerPage;
    return customers.slice(start, end);
  }

  getTotalCustomersPages(): number {
    const totalCustomers = this.getFilteredCustomers().length;
    return Math.ceil(totalCustomers / this.customersPerPage);
  }

  nextCustomersPage(): void {
    if (this.currentCustomersPage < this.getTotalCustomersPages()) {
      this.currentCustomersPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevCustomersPage(): void {
    if (this.currentCustomersPage > 1) {
      this.currentCustomersPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  setCustomersSort(by: 'name' | 'date' | 'totalSpent'): void {
    if (this.customersSortBy === by) {
      this.customersSortOrder = this.customersSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.customersSortBy = by;
      this.customersSortOrder = 'desc';
    }
    this.currentCustomersPage = 1;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#1abc9c', '#3498db', '#9b59b6', '#e74c3c',
      '#f39c12', '#2ecc71', '#34495e', '#16a085'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getCustomerStatusClass(customer: Customer): string {
    return customer.status === 'active' ? 'confirmed' :
      customer.status === 'inactive' ? 'pending' : 'cancelled';
  }

  getCustomerStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'inactive': 'Inactive',
      'blocked': 'Blocked'
    };
    return statusMap[status] || status;
  }

  getDoctorStatusClass(status: string): string {
    return status === 'active' ? 'confirmed' :
      status === 'pending' ? 'pending' : 'cancelled';
  }

  getDoctorStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'pending': 'Pending',
      'rejected': 'Rejected'
    };
    return statusMap[status] || status;
  }

  getCustomersWithOrdersCount(): number {
    return this.customers.filter(c => c.totalOrders > 0).length;
  }

  getHighValueCustomersCount(): number {
    return this.customers.filter(c => c.totalSpent > 1000).length;
  }

  getRecentCustomersCount(): number {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return this.customers.filter(c =>
      new Date(c.createdAt) > oneMonthAgo
    ).length;
  }

  getVIPCustomers(): Customer[] {
    return this.customers.filter(c => c.isVIP);
  }

  getRecentActivities(): CustomerActivity[] {
    return this.customerActivities.slice(0, 5);
  }

  getLowStockProducts(): Product[] {
    return this.stats.lowStockProducts || [];
  }

  viewCustomerDetails(customerId: string): void {
    const customer = this.customers.find(c => c._id === customerId);
    if (customer) {
      this.selectedCustomerDetails = customer;
      this.showCustomerModal = true;
      this.isEditingCustomer = false;
    }
  }

  editCustomer(customerId: string): void {
    const customer = this.customers.find(c => c._id === customerId);
    if (customer) {
      this.selectedCustomerDetails = { ...customer };
      this.showCustomerModal = true;
      this.isEditingCustomer = true;
    }
  }

  saveCustomer(): void {
    if (!this.selectedCustomerDetails.name || !this.selectedCustomerDetails.email) {
      alert('Please fill in required fields');
      return;
    }

    this.adminService.updateCustomer(this.selectedCustomerDetails._id, this.selectedCustomerDetails)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Customer updated successfully');
            this.closeCustomerModal();
            this.loadCustomers();
            this.loadDashboardData();
          } else {
            alert('Failed to update customer: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error updating customer:', error);
          alert('Error updating customer. Please try again.');
        }
      });
  }

  exportCustomers(): void {
    const customers = this.getFilteredCustomers();
    console.log('Exporting customers:', customers);

    const csvContent = this.generateCustomersCSV(customers);
    this.downloadCSV(csvContent, 'customers.csv');
  }

  private generateCustomersCSV(customers: Customer[]): string {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Status'];
    const rows = customers.map(c => [
      c.customerId,
      c.name,
      c.email,
      c.phone,
      c.totalOrders.toString(),
      c.totalSpent.toString(),
      c.status
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  showCustomersWithOrders(): void {
    this.customerSearchTerm = '';
    this.currentCustomersPage = 1;
  }

  showHighValueCustomers(): void {
    this.customerSearchTerm = '';
    this.currentCustomersPage = 1;
  }

  showRecentCustomers(): void {
    this.customerSearchTerm = '';
    this.currentCustomersPage = 1;
  }

  // ============================================
  // Doctor Management Functions
  // ============================================

  getFilteredDoctors(): User[] {
    let doctors = this.doctors;

    if (this.selectedDoctorFilter !== 'all') {
      doctors = doctors.filter(
        doctor => (doctor.status || '').toLowerCase() === this.selectedDoctorFilter.toLowerCase()
      );
    }

    if (this.doctorSearchTerm.trim()) {
      const searchTerm = this.doctorSearchTerm.toLowerCase();
      doctors = doctors.filter(doctor =>
        doctor.name.toLowerCase().includes(searchTerm) ||
        doctor.email.toLowerCase().includes(searchTerm) ||
        doctor.phone.includes(searchTerm)
      );
    }

    return doctors;
  }

  getSortedDoctors(): User[] {
    const doctors = this.getFilteredDoctors();

    return doctors.sort((a, b) => {
      let comparison = 0;

      switch (this.doctorsSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return this.doctorsSortOrder === 'asc' ? comparison : -comparison;
    });
  }

  getPaginatedDoctors(): User[] {
    const doctors = this.getSortedDoctors();
    const start = (this.currentDoctorsPage - 1) * this.doctorsPerPage;
    const end = start + this.doctorsPerPage;
    return doctors.slice(start, end);
  }

  getTotalDoctorsPages(): number {
    const totalDoctors = this.getFilteredDoctors().length;
    return Math.ceil(totalDoctors / this.doctorsPerPage);
  }

  nextDoctorsPage(): void {
    if (this.currentDoctorsPage < this.getTotalDoctorsPages()) {
      this.currentDoctorsPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevDoctorsPage(): void {
    if (this.currentDoctorsPage > 1) {
      this.currentDoctorsPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  setDoctorsSort(by: 'name' | 'date' | 'status'): void {
    if (this.doctorsSortBy === by) {
      this.doctorsSortOrder = this.doctorsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.doctorsSortBy = by;
      this.doctorsSortOrder = 'desc';
    }
    this.currentDoctorsPage = 1;
  }

  toggleDoctorSelection(doctorId: string): void {
    const index = this.selectedDoctors.indexOf(doctorId);
    if (index === -1) {
      this.selectedDoctors.push(doctorId);
    } else {
      this.selectedDoctors.splice(index, 1);
    }
  }

  bulkApproveDoctors(): void {
    if (this.selectedDoctors.length === 0) {
      alert('Please select doctors first');
      return;
    }

    const confirmed = confirm(`Approve ${this.selectedDoctors.length} selected doctors?`);
    if (confirmed) {
      this.adminService.bulkApproveDoctors(this.selectedDoctors)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess(`${this.selectedDoctors.length} doctors approved successfully`);
              this.selectedDoctors = [];
              this.loadDoctors();
              this.loadDashboardData();
            } else {
              alert('Failed to approve doctors: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error approving doctors:', error);
            alert('Error approving doctors. Please try again.');
          }
        });
    }
  }

  bulkRejectDoctors(): void {
    if (this.selectedDoctors.length === 0) {
      alert('Please select doctors first');
      return;
    }

    const confirmed = confirm(`Reject ${this.selectedDoctors.length} selected doctors?`);
    if (confirmed) {
      const reason = prompt('Enter rejection reason for all selected doctors:');
      if (reason) {
        this.adminService.bulkRejectDoctors(this.selectedDoctors, reason)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.showSuccess(`${this.selectedDoctors.length} doctors rejected successfully`);
                this.selectedDoctors = [];
                this.loadDoctors();
                this.loadDashboardData();
              } else {
                alert('Failed to reject doctors: ' + response.message);
              }
            },
            error: (error) => {
              console.error('Error rejecting doctors:', error);
              alert('Error rejecting doctors. Please try again.');
            }
          });
      }
    }
  }

  approveDoctor(doctorId: string): void {
    this.adminService.approveDoctor(doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Doctor approved successfully');
            this.loadDoctors();
            this.loadDashboardData();
          } else {
            alert('Failed to approve doctor: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error approving doctor:', error);
          alert('Error approving doctor. Please try again.');
        }
      });
  }

  rejectDoctor(doctorId: string): void {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      this.adminService.rejectDoctor(doctorId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess('Doctor rejected successfully');
              this.loadDoctors();
              this.loadDashboardData();
            } else {
              alert('Failed to reject doctor: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error rejecting doctor:', error);
            alert('Error rejecting doctor. Please try again.');
          }
        });
    }
  }

  // ============================================
  // Prescription Functions
  // ============================================

  getTotalPrescriptionsPages(): number {
    const totalPrescriptions = this.getFilteredPrescriptions().length;
    return Math.ceil(totalPrescriptions / this.prescriptionsPerPage);
  }

  getFilteredPrescriptions(): Prescription[] {
    let prescriptions = this.prescriptions;

    if (this.selectedPrescriptionTab !== 'all') {
      prescriptions = prescriptions.filter(p => {
        if (this.selectedPrescriptionTab === 'pending') return p.status === 'pending';
        if (this.selectedPrescriptionTab === 'approved') return p.status === 'active';
        if (this.selectedPrescriptionTab === 'rejected') return p.status === 'expired';
        return true;
      });
    }

    if (this.prescriptionSearchTerm.trim()) {
      const term = this.prescriptionSearchTerm.toLowerCase();
      prescriptions = prescriptions.filter(p =>
        p.prescriptionNumber.toLowerCase().includes(term) ||
        p.doctorName.toLowerCase().includes(term) ||
        p.patientName.toLowerCase().includes(term)
      );
    }

    return prescriptions;
  }

  getPaginatedPrescriptions(): Prescription[] {
    const prescriptions = this.getFilteredPrescriptions();
    const start = (this.currentPrescriptionsPage - 1) * this.prescriptionsPerPage;
    const end = start + this.prescriptionsPerPage;
    return prescriptions.slice(start, end);
  }

  setActivePage(page: string): void {
    this.activePage = page as any;
  }

  getRecentPrescriptions(): Prescription[] {
    return this.prescriptions
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }

  viewPrescriptionDetails(prescriptionId: string): void {
    const prescription = this.prescriptions.find(p => p._id === prescriptionId);
    if (prescription) {
      this.selectedPrescriptionDetails = prescription;
      this.showPrescriptionModal = true;
    }
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.successMessage = '', 3000);
  }

  getRecentOrders(): Order[] {
    return this.orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }

  getFilteredOrders(): Order[] {
    let filtered = this.orders;

    if (this.selectedOrderFilter !== 'all') {
      filtered = filtered.filter(order => order.status === this.selectedOrderFilter);
    }

    if (this.orderSearchTerm.trim()) {
      const term = this.orderSearchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  getPaginatedOrders(): Order[] {
    const orders = this.getFilteredOrders();
    const start = (this.currentOrdersPage - 1) * this.ordersPerPage;
    const end = start + this.ordersPerPage;
    return orders.slice(start, end);
  }

  getTotalOrdersPages(): number {
    return Math.ceil(this.getFilteredOrders().length / this.ordersPerPage);
  }

  viewOrder(orderId: string): void {
    const order = this.orders.find(o => o._id === orderId);
    if (order) {
      this.selectedOrderDetails = order;
      this.showOrderModal = true;
    }
  }

  updateOrderStatus(orderId: string, newStatus: string): void {
    this.isUpdatingOrder = true;
    this.adminService.updateOrderStatus(orderId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess(`Order status updated to ${newStatus}`);
            this.loadOrders();
            this.loadDashboardData();
            if (this.selectedOrderDetails && this.selectedOrderDetails._id === orderId) {
              this.selectedOrderDetails.status = newStatus;
            }
          } else {
            alert('Failed to update order status: ' + response.message);
          }
          this.isUpdatingOrder = false;
        },
        error: (error) => {
          console.error('Error updating order status:', error);
          alert('Error updating order status. Please try again.');
          this.isUpdatingOrder = false;
        }
      });
  }

  cancelOrder(orderId: string): void {
    const reason = prompt('Enter cancellation reason:');
    if (reason) {
      this.isUpdatingOrder = true;
      this.adminService.cancelOrder(orderId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess('Order cancelled successfully');
              this.loadOrders();
              this.loadDashboardData();
              if (this.selectedOrderDetails && this.selectedOrderDetails._id === orderId) {
                this.selectedOrderDetails.status = 'cancelled';
              }
            } else {
              alert('Failed to cancel order: ' + response.message);
            }
            this.isUpdatingOrder = false;
          },
          error: (error) => {
            console.error('Error cancelling order:', error);
            alert('Error cancelling order. Please try again.');
            this.isUpdatingOrder = false;
          }
        });
    }
  }

  closeOrderModal(): void {
    this.showOrderModal = false;
    this.selectedOrderDetails = null;
  }

  setOrderFilter(filter: string): void {
    this.selectedOrderFilter = filter;
    this.currentOrdersPage = 1;
    this.loadOrders();
  }

  // ============================================
  // Coupon Management Methods
  // ============================================

  openCouponModal(coupon?: any): void {
    if (coupon) {
      this.isEditingCoupon = true;
      this.newCoupon = { ...coupon };
    } else {
      this.isEditingCoupon = false;
      this.resetCouponForm();
    }
    this.showCouponModal = true;
  }

  closeCouponModal(): void {
    this.showCouponModal = false;
    this.selectedCouponDetails = null;
    this.resetCouponForm();
  }

  resetCouponForm(): void {
    this.newCoupon = {
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minimumPurchase: 0,
      maximumDiscount: 0,
      usageLimit: 0,
      expiryDate: '',
      isActive: true
    };
  }

  saveCoupon(): void {
    if (this.isEditingCoupon) {
      this.updateCoupon();
    } else {
      this.createCoupon();
    }
  }

  createCoupon(): void {
    this.adminService.createCoupon(this.newCoupon)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Coupon created successfully');
            this.closeCouponModal();
            this.loadCoupons();
            this.loadDashboardData();
          } else {
            alert('Failed to create coupon: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error creating coupon:', error);
          alert('Error creating coupon. Please try again.');
        }
      });
  }

  updateCoupon(): void {
    const couponId = this.newCoupon._id;
    this.adminService.updateCoupon(couponId, this.newCoupon)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Coupon updated successfully');
            this.closeCouponModal();
            this.loadCoupons();
            this.loadDashboardData();
          } else {
            alert('Failed to update coupon: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error updating coupon:', error);
          alert('Error updating coupon. Please try again.');
        }
      });
  }

  deleteCoupon(couponId: string): void {
    if (confirm('Are you sure you want to delete this coupon?')) {
      this.adminService.deleteCoupon(couponId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess('Coupon deleted successfully');
              this.loadCoupons();
              this.loadDashboardData();
            } else {
              alert('Failed to delete coupon: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error deleting coupon:', error);
            alert('Error deleting coupon. Please try again.');
          }
        });
    }
  }

  viewCouponDetails(couponId: string): void {
    const coupon = this.coupons.find(c => c._id === couponId);
    if (coupon) {
      this.selectedCouponDetails = coupon;
      this.showCouponModal = true;
      this.adminService.getCouponStats(couponId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.selectedCouponDetails.stats = response.data.stats || response.data;
            }
          },
          error: (error) => {
            console.error('Error loading coupon stats:', error);
          }
        });
    }
  }

  getFilteredCoupons(): any[] {
    let filtered = this.coupons;

    if (this.selectedCouponFilter !== 'all') {
      filtered = filtered.filter(coupon => {
        const now = new Date();
        const expiry = new Date(coupon.expiryDate);
        if (this.selectedCouponFilter === 'active') {
          return (coupon.isActive || coupon.status === 'active') && expiry > now;
        } else if (this.selectedCouponFilter === 'expired') {
          return expiry <= now || coupon.status === 'expired';
        } else if (this.selectedCouponFilter === 'inactive') {
          return !coupon.isActive && coupon.status !== 'active';
        }
        return true;
      });
    }

    if (this.couponSearchTerm.trim()) {
      const term = this.couponSearchTerm.toLowerCase();
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(term) ||
        (coupon.description && coupon.description.toLowerCase().includes(term))
      );
    }

    return filtered;
  }

  getPaginatedCoupons(): any[] {
    const coupons = this.getFilteredCoupons();
    const start = (this.currentCouponsPage - 1) * this.couponsPerPage;
    const end = start + this.couponsPerPage;
    return coupons.slice(start, end);
  }

  getTotalCouponsPages(): number {
    return Math.ceil(this.getFilteredCoupons().length / this.couponsPerPage);
  }

  setCouponFilter(filter: string): void {
    this.selectedCouponFilter = filter;
    this.currentCouponsPage = 1;
  }

  prevCouponsPage(): void {
    if (this.currentCouponsPage > 1) {
      this.currentCouponsPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextCouponsPage(): void {
    if (this.currentCouponsPage < this.getTotalCouponsPages()) {
      this.currentCouponsPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ============================================
  // Product Management Functions
  // ============================================

  openAddProductForm(): void {
    this.resetProductForm();
    this.activePage = 'add-product';
  }

  setProductFilter(filter: string): void {
    this.selectedProductFilter = filter;
    this.loadProducts();
  }

  getFilteredProducts(): Product[] {
    let products = this.allProducts;

    switch (this.selectedProductFilter) {
      case 'low-stock':
        return products.filter(p => p.stock > 0 && p.stock <= 10);
      case 'out-of-stock':
        return products.filter(p => p.stock === 0);
      default:
        return products;
    }
  }

  getProductStatusClass(stock: number): string {
    if (stock === 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
  }

  getProductStatusText(stock: number): string {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
    return 'In Stock';
  }

  updateProduct(productId: string): void {
    const product = this.allProducts.find(p => p._id === productId);
    if (product) {
      this.newProduct = { ...product };
      this.isEditingProduct = true;
      this.editingProductId = productId;
      this.activePage = 'add-product';
    }
  }

  deleteProduct(productId: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.adminService.deleteProduct(productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess('Product deleted successfully');
              this.loadProducts();
              this.loadDashboardData();
            } else {
              alert('Failed to delete product: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            alert('Error deleting product. Please try again.');
          }
        });
    }
  }

  viewProduct(productId: string): void {
    console.log('Viewing product details:', productId);
  }

  goToProducts(): void {
    this.activePage = 'products';
  }

  saveProduct(): void {
    if (!this.newProduct.name || !this.newProduct.category) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    const operation = this.isEditingProduct ? 'update' : 'create';
    const apiCall = this.isEditingProduct
      ? this.adminService.updateProduct(this.editingProductId, this.newProduct)
      : this.adminService.createProduct(this.newProduct);

    apiCall.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.showSuccess(`Product ${operation}d successfully`);
            this.resetProductForm();
            this.activePage = 'products';
            this.loadProducts();
            this.loadDashboardData();
          } else {
            alert(`Failed to ${operation} product: ${response.message}`);
          }
          this.isSaving = false;
        },
        error: (error: any) => {
          console.error(`Error ${operation}ing product:`, error);
          alert(`Error ${operation}ing product. Please try again.`);
          this.isSaving = false;
        }
      });
  }

  resetProductForm(): void {
    this.newProduct = {
      name: '',
      nameArabic: '',
      category: '',
      price: 0,
      stock: 0
    };
    this.isEditingProduct = false;
    this.editingProductId = '';
  }

  setDoctorFilter(filter: string): void {
    this.selectedDoctorFilter = filter;
    this.currentDoctorsPage = 1;
    this.loadDoctors();
  }

  exportDoctors(): void {
    const doctors = this.getFilteredDoctors();
    console.log('Exporting doctors:', doctors);
  }

  viewDoctorDetails(doctorId: string): void {
    const doctor = this.doctors.find(d => d._id === doctorId);
    if (doctor) {
      this.selectedDoctorDetails = doctor;
      this.showDoctorModal = true;
    }
  }

  setPrescriptionTab(tab: string): void {
    this.selectedPrescriptionTab = tab;
    this.currentPrescriptionsPage = 1;
    this.loadPrescriptions();
  }

  bulkApprovePrescriptions(): void {
    if (this.selectedPrescriptions.length === 0) {
      alert('Please select prescriptions first');
      return;
    }

    const confirmed = confirm(`Approve ${this.selectedPrescriptions.length} selected prescriptions?`);
    if (confirmed) {
      this.adminService.bulkApprovePrescriptions(this.selectedPrescriptions)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess(`${this.selectedPrescriptions.length} prescriptions approved successfully`);
              this.selectedPrescriptions = [];
              this.loadPrescriptions();
              this.loadDashboardData();
            } else {
              alert('Failed to approve prescriptions: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error approving prescriptions:', error);
            alert('Error approving prescriptions. Please try again.');
          }
        });
    }
  }

  bulkRejectPrescriptions(): void {
    if (this.selectedPrescriptions.length === 0) {
      alert('Please select prescriptions first');
      return;
    }

    const confirmed = confirm(`Reject ${this.selectedPrescriptions.length} selected prescriptions?`);
    if (confirmed) {
      const reason = prompt('Enter rejection reason for all selected prescriptions:');
      if (reason) {
        this.adminService.bulkRejectPrescriptions(this.selectedPrescriptions, reason)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.showSuccess(`${this.selectedPrescriptions.length} prescriptions rejected successfully`);
                this.selectedPrescriptions = [];
                this.loadPrescriptions();
                this.loadDashboardData();
              } else {
                alert('Failed to reject prescriptions: ' + response.message);
              }
            },
            error: (error) => {
              console.error('Error rejecting prescriptions:', error);
              alert('Error rejecting prescriptions. Please try again.');
            }
          });
      }
    }
  }

  approvePrescription(prescriptionId: string): void {
    this.adminService.approvePrescription(prescriptionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Prescription approved successfully');
            this.loadPrescriptions();
            this.loadDashboardData();
            if (this.showPrescriptionModal) {
              this.closePrescriptionModal();
            }
          } else {
            alert('Failed to approve prescription: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error approving prescription:', error);
          alert('Error approving prescription. Please try again.');
        }
      });
  }

  rejectPrescription(prescriptionId: string): void {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      this.adminService.rejectPrescription(prescriptionId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess('Prescription rejected successfully');
              this.loadPrescriptions();
              this.loadDashboardData();
              if (this.showPrescriptionModal) {
                this.closePrescriptionModal();
              }
            } else {
              alert('Failed to reject prescription: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error rejecting prescription:', error);
            alert('Error rejecting prescription. Please try again.');
          }
        });
    }
  }

  togglePrescriptionSelection(prescriptionId: string): void {
    const index = this.selectedPrescriptions.indexOf(prescriptionId);
    if (index === -1) {
      this.selectedPrescriptions.push(prescriptionId);
    } else {
      this.selectedPrescriptions.splice(index, 1);
    }
  }

  setPrescriptionsSort(by: 'date' | 'doctor' | 'status'): void {
    if (this.prescriptionsSortBy === by) {
      this.prescriptionsSortOrder = this.prescriptionsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.prescriptionsSortBy = by;
      this.prescriptionsSortOrder = 'desc';
    }
    this.currentPrescriptionsPage = 1;
  }

  getPrescriptionStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'pending',
      'approved': 'confirmed',
      'active': 'confirmed',
      'rejected': 'cancelled',
      'expired': 'cancelled'
    };
    return statusClasses[status.toLowerCase()] || 'pending';
  }

  getPrescriptionStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'pending': 'Pending',
      'approved': 'Approved',
      'active': 'Approved',
      'rejected': 'Rejected',
      'expired': 'Rejected'
    };
    return statusTexts[status.toLowerCase()] || status;
  }

  printPrescription(prescriptionId: string): void {
    console.log('Printing prescription:', prescriptionId);
  }

  prevPrescriptionsPage(): void {
    if (this.currentPrescriptionsPage > 1) {
      this.currentPrescriptionsPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPrescriptionsPage(): void {
    if (this.currentPrescriptionsPage < this.getTotalPrescriptionsPages()) {
      this.currentPrescriptionsPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevOrdersPage(): void {
    if (this.currentOrdersPage > 1) {
      this.currentOrdersPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextOrdersPage(): void {
    if (this.currentOrdersPage < this.getTotalOrdersPages()) {
      this.currentOrdersPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  exportPrescriptions(): void {
    const prescriptions = this.getFilteredPrescriptions();
    console.log('Exporting prescriptions:', prescriptions);
  }

  showTodayPrescriptions(): void {
    console.log('Showing today\'s prescriptions');
  }

  showTopDoctors(): void {
    console.log('Showing top doctors');
  }

  generatePrescriptionReport(): void {
    console.log('Generating prescription report');
  }

  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
    this.selectedPrescriptionDetails = null;
  }

  closeDoctorModal(): void {
    this.showDoctorModal = false;
    this.selectedDoctorDetails = null;
  }

  closeCustomerModal(): void {
    this.showCustomerModal = false;
    this.selectedCustomerDetails = null;
    this.isEditingCustomer = false;
  }

  sendMessageToCustomer(customerId: string): void {
    const customer = this.customers.find(c => c._id === customerId);
    if (customer) {
      const message = prompt(`Send message to ${customer.name}:`);
      if (message) {
        this.showSuccess(`Message sent to ${customer.name}`);
      }
    }
  }

  generateReport(): void {
    console.log('Generating sales report');
  }

  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.router.navigate(['/login']);
    }
  }
}
