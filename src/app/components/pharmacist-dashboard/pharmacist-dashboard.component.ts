// src/app/components/pharmacist-dashpoard/pharmacist-dashpoard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PharmacistService } from '../../services/pharmacist.service';
import { AuthService } from '../../services/auth.service';

// Interfaces
interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  pricing: { total: number };
  createdAt: string;
  customer?: { name: string; phone: string };
}

interface Product {
  _id: string;
  name: string;
  nameArabic: string;
  stock: number;
  lowStockThreshold: number;
  sku: string;
}

interface DashboardStats {
  orders: { new: number; processing: number; today: number };
  revenue: { today: number };
  prescriptions: { new: number };
  inventory: { lowStock: number; outOfStock: number };
  lowStockProducts: Product[];
  recentOrders: Order[];
}

interface StatusConfig {
  text: string;
  class: string;
}

@Component({
  selector: 'app-pharmacist-dashboard',
  templateUrl: './pharmacist-dashboard.component.html',
  styleUrls: ['./pharmacist-dashboard.component.css']
})
export class PharmacistDashboardComponent implements OnInit, OnDestroy {
  // Properties
  stats: DashboardStats = {
    orders: { new: 0, processing: 0, today: 0 },
    revenue: { today: 0 },
    prescriptions: { new: 0 },
    inventory: { lowStock: 0, outOfStock: 0 },
    lowStockProducts: [],
    recentOrders: []
  };

  isLoading = true;
  isRefreshing = false;
  notificationCount = 0;
  activeMenu = 'home';
  Math = Math; // Add Math for template access

  // Private properties
  private destroy$ = new Subject<void>();
  private refreshInterval: any;

  // Status mapping - English version
  private statusMap: { [key: string]: StatusConfig } = {
    pending: { text: 'Pending', class: 'pending' },
    confirmed: { text: 'Confirmed', class: 'confirmed' },
    preparing: { text: 'Preparing', class: 'preparing' },
    'ready-for-pickup': { text: 'Ready for Pickup', class: 'ready' },
    'out-for-delivery': { text: 'Out for Delivery', class: 'ready' },
    delivered: { text: 'Delivered', class: 'delivered' },
    cancelled: { text: 'Cancelled', class: 'cancelled' },
    returned: { text: 'Returned', class: 'cancelled' }
  };

  constructor(
    private pharmacistService: PharmacistService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Load dashboard data from service
   */
  loadDashboardData(): void {
    this.isLoading = true;

    this.pharmacistService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.handleDashboardResponse(response);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Dashboard Error:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Refresh dashboard data
   */
  refreshDashboard(): void {
    this.isRefreshing = true;

    this.pharmacistService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.handleDashboardResponse(response);
          this.isRefreshing = false;
        },
        error: (error: any) => {
          console.error('Refresh Error:', error);
          this.isRefreshing = false;
        }
      });
  }

  /**
   * Handle dashboard API response
   */
  private handleDashboardResponse(response: any): void {
    if (response?.data?.stats) {
      this.stats = response.data.stats;
      this.calculateNotifications();
    } else if (response?.stats) {
      this.stats = response.stats;
      this.calculateNotifications();
    }
  }

  /**
   * Setup auto-refresh interval (every 5 minutes)
   */
  private setupAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshDashboard();
    }, 5 * 60 * 1000);
  }

  /**
   * Calculate notification count
   */
  private calculateNotifications(): void {
    if (!this.stats) return;

    this.notificationCount =
      (this.stats.orders?.new || 0) +
      (this.stats.inventory?.lowStock || 0) +
      (this.stats.prescriptions?.new || 0);
  }

  /**
   * Format currency to USD format
   */
  formatCurrency(value: number): string {
    if (!value || value === 0) return '$0.00';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Format date in English format
   */
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
      console.error('Date Format Error:', error);
      return '';
    }
  }

  /**
   * Get status text in English
   */
  getStatusText(status: string): string {
    return this.statusMap[status]?.text || 'Unknown';
  }

  /**
   * Get status badge CSS class
   */
  getStatusBadgeClass(status: string): string {
    const statusClass = this.statusMap[status]?.class || 'pending';
    return `status-badge ${statusClass}`;
  }

  /**
   * Get recent orders
   */
  getRecentOrders(): Order[] {
    return this.stats.recentOrders || [];
  }

  /**
   * Get low stock products
   */
  getLowStockProducts(): Product[] {
    if (!this.stats.lowStockProducts) return [];
    return this.stats.lowStockProducts.filter(p => p.stock > 0 && p.stock <= 10);
  }

  /**
   * Get out of stock products
   */
  getOutOfStockProducts(): Product[] {
    if (!this.stats.lowStockProducts) return [];
    return this.stats.lowStockProducts.filter(p => p.stock === 0);
  }

  /**
   * Set active menu item
   */
  setActiveMenu(menuId: string): void {
    this.activeMenu = menuId;
  }

  /**
   * Navigate to order details
   */
  goToOrder(orderNumber: string): void {
    if (orderNumber) {
      this.router.navigate(['/pharmacist-dashboard/orders', orderNumber]);
    } else {
      this.router.navigate(['/pharmacist-dashboard/orders']);
    }
  }

  /**
   * Navigate to inventory management
   */
  goToInventory(): void {
    this.router.navigate(['/pharmacist-dashboard/inventory']);
  }

  /**
   * Navigate to prescriptions
   */
  goToPrescriptions(): void {
    this.router.navigate(['/pharmacist-dashboard/prescriptions']);
  }

  /**
   * Navigate to settings
   */
  goToSettings(): void {
    this.router.navigate(['/pharmacist-dashboard/settings']);
  }

  /**
   * Update product stock
   */
  updateProductStock(product: Product): void {
    this.router.navigate(['/pharmacist-dashboard/inventory/edit', product._id]);
  }

  /**
   * Confirm order
   */
  confirmOrder(order: Order): void {
    const confirmed = confirm(`Are you sure you want to confirm order ${order.orderNumber}?`);

    if (!confirmed) return;

    this.pharmacistService.confirmOrder(order._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Order confirmed successfully!');
          this.loadDashboardData();
        },
        error: (error: any) => {
          console.error('Confirm Error:', error);
          alert('Failed to confirm order');
        }
      });
  }

  /**
   * Generate report
   */
  generateReport(): void {
    this.router.navigate(['/pharmacist-dashboard/reports']);
  }

  /**
   * Logout user
   */
  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');

    if (!confirmed) return;

    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
