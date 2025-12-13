// ==========================================
// 📄 File: src/app/components/user-dashboard/user-dashboard.component.ts
// ==========================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

// Interfaces for User Dashboard
interface Prescription {
  _id: string;
  prescriptionNumber: string;
  doctorName: string;
  date: string;
  status: 'active' | 'completed' | 'expired';
  medications: Medication[];
  downloadUrl?: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  pharmacyName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready-for-pickup' | 'out-for-delivery' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  createdAt: string;
  estimatedDelivery?: string;
}

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface Consultation {
  _id: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  type: 'video' | 'chat' | 'voice';
  meetingLink?: string;
}

interface DashboardStats {
  activePrescriptions: number;
  activeOrders: number;
  upcomingConsultations: number;
  totalSpent: number;
}

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  // Properties
  stats: DashboardStats = {
    activePrescriptions: 0,
    activeOrders: 0,
    upcomingConsultations: 0,
    totalSpent: 0
  };

  prescriptions: Prescription[] = [];
  orders: Order[] = [];
  consultations: Consultation[] = [];

  isLoading = true;
  isRefreshing = false;
  activeMenu = 'overview';
  currentUser: any = null;
  Math = Math;

  // Modals
  showPrescriptionModal = false;
  showOrderModal = false;
  selectedPrescription: Prescription | null = null;
  selectedOrder: Order | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load current user data
   */
  loadUserData(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  /**
   * Load dashboard data
   */
  loadDashboardData(): void {
    this.isLoading = true;

    // TODO: Replace with actual API calls
    // For now, using mock data
    setTimeout(() => {
      this.loadMockData();
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Load mock data (replace with actual API calls)
   */
  private loadMockData(): void {
    // Mock Prescriptions
    this.prescriptions = [
      {
        _id: '1',
        prescriptionNumber: 'RX-001',
        doctorName: 'Dr. Ahmed Hassan',
        date: new Date().toISOString(),
        status: 'active',
        medications: [
          { name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' },
          { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '5 days' }
        ]
      },
      {
        _id: '2',
        prescriptionNumber: 'RX-002',
        doctorName: 'Dr. Sara Mohamed',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        medications: [
          { name: 'Ibuprofen', dosage: '400mg', frequency: '2 times daily', duration: '3 days' }
        ]
      }
    ];

    // Mock Orders
    this.orders = [
      {
        _id: '1',
        orderNumber: 'ORD-001',
        pharmacyName: 'PharmaCare Pharmacy',
        status: 'out-for-delivery',
        items: [
          { productName: 'Amoxicillin 500mg', quantity: 2, price: 50 },
          { productName: 'Paracetamol 500mg', quantity: 1, price: 25 }
        ],
        total: 125,
        createdAt: new Date().toISOString(),
        estimatedDelivery: '2 hours'
      },
      {
        _id: '2',
        orderNumber: 'ORD-002',
        pharmacyName: 'HealthPlus Pharmacy',
        status: 'delivered',
        items: [
          { productName: 'Vitamin C', quantity: 1, price: 40 }
        ],
        total: 40,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Mock Consultations
    this.consultations = [
      {
        _id: '1',
        doctorName: 'Dr. Ahmed Hassan',
        doctorSpecialty: 'General Physician',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: '10:00 AM',
        status: 'scheduled',
        type: 'video',
        meetingLink: 'https://meet.example.com/abc123'
      }
    ];

    this.calculateStats();
  }

  /**
   * Calculate dashboard statistics
   */
  private calculateStats(): void {
    this.stats = {
      activePrescriptions: this.prescriptions.filter(p => p.status === 'active').length,
      activeOrders: this.orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
      upcomingConsultations: this.consultations.filter(c => c.status === 'scheduled').length,
      totalSpent: this.orders.reduce((sum, order) => sum + order.total, 0)
    };
  }

  /**
   * Refresh dashboard data
   */
  refreshDashboard(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.loadDashboardData();
      this.isRefreshing = false;
    }, 1000);
  }

  /**
   * Set active menu
   */
  setActiveMenu(menuId: string): void {
    this.activeMenu = menuId;
  }

  /**
   * View prescription details
   */
  viewPrescription(prescription: Prescription): void {
    this.selectedPrescription = prescription;
    this.showPrescriptionModal = true;
  }

  /**
   * Close prescription modal
   */
  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
    this.selectedPrescription = null;
  }

  /**
   * Download prescription
   */
  downloadPrescription(prescription: Prescription): void {
    alert(`Downloading prescription: ${prescription.prescriptionNumber}`);
    // TODO: Implement actual download logic
  }

  /**
   * Send prescription to pharmacy
   */
  sendToPharmacy(prescription: Prescription): void {
    if (confirm('Send this prescription to the pharmacy?')) {
      alert('Prescription sent to pharmacy successfully!');
      // TODO: Implement actual API call
    }
  }

  /**
   * View order details
   */
  viewOrder(order: Order): void {
    this.selectedOrder = order;
    this.showOrderModal = true;
  }

  /**
   * Close order modal
   */
  closeOrderModal(): void {
    this.showOrderModal = false;
    this.selectedOrder = null;
  }

  /**
   * Track order
   */
  trackOrder(order: Order): void {
    alert(`Tracking order: ${order.orderNumber}`);
    // TODO: Navigate to tracking page
  }

  /**
   * Cancel order
   */
  cancelOrder(order: Order): void {
    if (confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
      alert('Order cancelled successfully!');
      // TODO: Implement actual API call
      this.loadDashboardData();
    }
  }

  /**
   * Join consultation
   */
  joinConsultation(consultation: Consultation): void {
    if (consultation.meetingLink) {
      window.open(consultation.meetingLink, '_blank');
    } else {
      alert('Meeting link not available yet');
    }
  }

  /**
   * Upload prescription
   */
  uploadPrescription(): void {
    this.router.navigate(['/user-dashboard/upload']);
  }

  /**
   * Book consultation
   */
  bookConsultation(): void {
    this.router.navigate(['/doctors']);
  }

  /**
   * Browse products
   */
  browseProducts(): void {
    this.router.navigate(['/pharmacy']);
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'completed': 'Completed',
      'expired': 'Expired',
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready-for-pickup': 'Ready for Pickup',
      'out-for-delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'scheduled': 'Scheduled'
    };
    return statusMap[status] || status;
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'active': 'status-success',
      'completed': 'status-completed',
      'expired': 'status-danger',
      'pending': 'status-warning',
      'confirmed': 'status-info',
      'preparing': 'status-warning',
      'ready-for-pickup': 'status-success',
      'out-for-delivery': 'status-purple',
      'delivered': 'status-success',
      'cancelled': 'status-danger',
      'scheduled': 'status-info'
    };
    return classMap[status] || 'status-default';
  }

  /**
   * Get recent prescriptions
   */
  getRecentPrescriptions(): Prescription[] {
    return this.prescriptions.slice(0, 3);
  }

  /**
   * Get recent orders
   */
  getRecentOrders(): Order[] {
    return this.orders.slice(0, 3);
  }

  /**
   * Get upcoming consultations
   */
  getUpcomingConsultations(): Consultation[] {
    return this.consultations.filter(c => c.status === 'scheduled').slice(0, 3);
  }

  /**
   * Logout
   */
  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
    }
  }
}