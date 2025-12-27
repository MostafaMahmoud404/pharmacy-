import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  // ============================================
  // 1. Dashboard Stats
  // ============================================

  /**
   * GET /api/admin/dashboard/stats
   * Returns: DashboardStats object
   */
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/stats`);
  }

  // ============================================
  // 2. Products Management
  // ============================================

  /**
   * GET /api/admin/products
   * Query params: ?page=1&limit=10&filter=all|low-stock|out-of-stock
   */
  getProducts(page: number, limit: number, filter: string): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('filter', filter);
    return this.http.get(`${this.apiUrl}/products`, { params });
  }

  /**
   * POST /api/admin/products
   * Body: { name, nameArabic, category, price, stock }
   */
  createProduct(product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/products`, product);
  }

  /**
   * PUT /api/admin/products/:id
   * Body: { name, nameArabic, category, price, stock }
   */
  updateProduct(id: string, product: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/products/${id}`, product);
  }

  /**
   * DELETE /api/admin/products/:id
   */
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`);
  }

  /**
   * GET /api/admin/products/low-stock
   */
  getLowStockProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/low-stock`);
  }

  // ============================================
  // 3. Doctors Management
  // ============================================

  /**
   * GET /api/admin/doctors
   * Query params: ?page=1&limit=10&status=all|active|pending&search=name
   */
  getDoctors(page: number, limit: number, status: string, search: string): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('status', status)
      .set('search', search);
    return this.http.get(`${this.apiUrl}/doctors`, { params });
  }

  /**
   * PUT /api/admin/doctors/:id/approve
   */
  approveDoctor(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/doctors/${id}/approve`, {});
  }

  /**
   * PUT /api/admin/doctors/:id/reject
   * Body: { reason: string }
   */
  rejectDoctor(id: string, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/doctors/${id}/reject`, { reason });
  }

  /**
   * POST /api/admin/doctors/bulk-approve
   * Body: { doctorIds: string[] }
   */
  bulkApproveDoctors(doctorIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/doctors/bulk-approve`, { doctorIds });
  }

  /**
   * POST /api/admin/doctors/bulk-reject
   * Body: { doctorIds: string[], reason: string }
   */
  bulkRejectDoctors(doctorIds: string[], reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/doctors/bulk-reject`, { doctorIds, reason });
  }

  /**
   * GET /api/admin/doctors/:id
   */
  getDoctorDetails(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/doctors/${id}`);
  }

  // ============================================
  // 4. Customers Management
  // ============================================

  /**
   * GET /api/admin/customers
   * Query params: ?page=1&limit=10&search=name&sortBy=date&sortOrder=desc
   */
  getCustomers(page: number, limit: number, search: string, sortBy: string, sortOrder: string): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);
    return this.http.get(`${this.apiUrl}/customers`, { params });
  }

  /**
   * GET /api/admin/customers/:id
   */
  getCustomerDetails(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/customers/${id}`);
  }

  /**
   * PUT /api/admin/customers/:id
   * Body: customer data
   */
  updateCustomer(id: string, customer: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/customers/${id}`, customer);
  }

  /**
   * GET /api/admin/customers/activities
   * Returns recent customer activities
   */
  getCustomerActivities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/customers/activities`);
  }

  /**
   * GET /api/admin/customers/export
   * Returns CSV file
   */
  exportCustomers(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/customers/export`, { responseType: 'blob' });
  }

  // ============================================
  // 5. Prescriptions Management
  // ============================================

  /**
   * GET /api/admin/prescriptions
   * Query params: ?page=1&limit=10&status=all|pending|approved|rejected&search=text
   */
  getPrescriptions(page: number, limit: number, status: string, search: string): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('status', status)
      .set('search', search);
    return this.http.get(`${this.apiUrl}/prescriptions`, { params });
  }

  /**
   * GET /api/admin/prescriptions/:id
   */
  getPrescriptionDetails(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prescriptions/${id}`);
  }

  /**
   * PUT /api/admin/prescriptions/:id/approve
   */
  approvePrescription(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/prescriptions/${id}/approve`, {});
  }

  /**
   * PUT /api/admin/prescriptions/:id/reject
   * Body: { reason: string }
   */
  rejectPrescription(id: string, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/prescriptions/${id}/reject`, { reason });
  }

  /**
   * POST /api/admin/prescriptions/bulk-approve
   * Body: { prescriptionIds: string[] }
   */
  bulkApprovePrescriptions(prescriptionIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/prescriptions/bulk-approve`, { prescriptionIds });
  }

  /**
   * POST /api/admin/prescriptions/bulk-reject
   * Body: { prescriptionIds: string[], reason: string }
   */
  bulkRejectPrescriptions(prescriptionIds: string[], reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/prescriptions/bulk-reject`, { prescriptionIds, reason });
  }

  /**
   * GET /api/admin/prescriptions/export
   * Returns CSV file
   */
  exportPrescriptions(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/prescriptions/export`, { responseType: 'blob' });
  }

  // ============================================
  // 6. Orders Management
  // ============================================

  /**
   * GET /api/admin/orders
   * Query params: ?page=1&limit=10&status=all|pending|delivered
   */
  getOrders(page: number, limit: number, status: string): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('status', status);
    return this.http.get(`${this.apiUrl}/orders`, { params });
  }

  /**
   * GET /api/admin/orders/:id
   */
  getOrderDetails(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/${id}`);
  }

  /**
   * PUT /api/admin/orders/:id/status
   * Body: { status: string }
   */
  updateOrderStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${id}/status`, { status });
  }

  /**
   * PUT /api/admin/orders/:id/cancel
   * Body: { reason: string }
   */
  cancelOrder(id: string, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${id}/cancel`, { reason });
  }

  // ============================================
  // 7. Coupons Management
  // ============================================

  /**
   * GET /api/admin/coupons
   * Query params: ?status=all|active|expired
   */
  getCoupons(status: string): Observable<any> {
    const params = new HttpParams().set('status', status);
    return this.http.get(`${this.apiUrl}/coupons`, { params });
  }

  /**
   * POST /api/admin/coupons
   * Body: { code, discount, expiryDate, usageLimit }
   */
  createCoupon(coupon: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/coupons`, coupon);
  }

  /**
   * PUT /api/admin/coupons/:id
   * Body: coupon data
   */
  updateCoupon(id: string, coupon: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/coupons/${id}`, coupon);
  }

  /**
   * DELETE /api/admin/coupons/:id
   */
  deleteCoupon(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/coupons/${id}`);
  }

  /**
   * GET /api/admin/coupons/:id/stats
   */
  getCouponStats(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/coupons/${id}/stats`);
  }

  // ============================================
  // 8. Reports & Analytics
  // ============================================

  /**
   * GET /api/admin/reports/sales
   * Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  getSalesReport(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get(`${this.apiUrl}/reports/sales`, { params });
  }

  /**
   * GET /api/admin/reports/export
   * Query params: ?type=pdf|excel&report=sales|products|customers
   * Returns file blob
   */
  exportReport(type: string, report: string): Observable<Blob> {
    const params = new HttpParams()
      .set('type', type)
      .set('report', report);
    return this.http.get(`${this.apiUrl}/reports/export`, {
      params,
      responseType: 'blob'
    });
  }
}

// ============================================
// Backend Response Interfaces
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}
