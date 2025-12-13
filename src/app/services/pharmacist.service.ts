// src/app/services/pharmacist.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: {
    stats: any;
  };
}

export interface OrderResponse {
  success: boolean;
  message: string;
  data: {
    order: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistService {
  private apiUrl = environment.apiUrl;
  private dashboardUrl = `${this.apiUrl}/api/dashboard`;
  private ordersUrl = `${this.apiUrl}/api/orders`;
  private prescriptionsUrl = `${this.apiUrl}/api/prescriptions`;
  private productsUrl = `${this.apiUrl}/api/products`;

  constructor(private http: HttpClient) {
    console.log('API Base URL:', this.apiUrl);
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'حدث خطأ في الاتصال بالخادم';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.status) {
      errorMessage = `خطأ ${error.status}: ${error.error?.message || 'فشل الطلب'}`;
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Get pharmacist dashboard data
   */
  getDashboard(): Observable<DashboardResponse> {
    const url = `${this.dashboardUrl}/pharmacist`;
    console.log('Fetching dashboard from:', url);

    return this.http.get<DashboardResponse>(url).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get all orders
   */
  getOrders(
    page: number = 1,
    limit: number = 10,
    status?: string,
    sortBy: string = '-createdAt'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sortBy);

    if (status) {
      params = params.set('status', status);
    }

    console.log('Fetching orders with params:', params);

    return this.http.get<any>(`${this.ordersUrl}`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get single order by ID
   */
  getOrderById(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.ordersUrl}/${orderId}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get order by order number
   */
  getOrderByNumber(orderNumber: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.ordersUrl}/number/${orderNumber}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Confirm order
   */
  confirmOrder(orderId: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.ordersUrl}/${orderId}/confirm`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update order status
   */
  updateOrderStatus(
    orderId: string,
    newStatus: string,
    note?: string
  ): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.ordersUrl}/${orderId}/status`, {
      status: newStatus,
      note: note || ''
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Prepare order for delivery
   */
  prepareOrder(orderId: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.ordersUrl}/${orderId}/prepare`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get prescriptions
   */
  getPrescriptions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    sentToPharmacy?: boolean
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    if (sentToPharmacy !== undefined) {
      params = params.set('sentToPharmacy', sentToPharmacy.toString());
    }

    return this.http.get<any>(`${this.prescriptionsUrl}`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get prescription by ID
   */
  getPrescriptionById(prescriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.prescriptionsUrl}/${prescriptionId}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Verify prescription
   */
  verifyPrescription(prescriptionId: string, notes?: string): Observable<any> {
    return this.http.put<any>(`${this.prescriptionsUrl}/${prescriptionId}/verify`, {
      verificationNotes: notes || ''
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get products
   */
  getProducts(
    page: number = 1,
    limit: number = 20,
    category?: string,
    sortBy: string = '-createdAt'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sortBy);

    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<any>(`${this.productsUrl}`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get products with low stock
   */
  getLowStockProducts(limit: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('stock', `[0,10]`)
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.productsUrl}`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get product by ID
   */
  getProductById(productId: string): Observable<any> {
    return this.http.get<any>(`${this.productsUrl}/${productId}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Update product
   */
  updateProduct(productId: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.productsUrl}/${productId}`, data).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update product stock
   */
  updateProductStock(productId: string, quantity: number, operation: 'increase' | 'decrease'): Observable<any> {
    return this.http.put<any>(`${this.productsUrl}/${productId}/stock`, {
      quantity,
      operation
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Search products
   */
  searchProducts(query: string, limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.productsUrl}`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get orders statistics
   */
  getOrdersStats(startDate?: Date, endDate?: Date): Observable<any> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<any>(`${this.ordersUrl}/stats`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Export orders to CSV
   */
  exportOrders(startDate?: Date, endDate?: Date): Observable<Blob> {
    let params = new HttpParams().set('format', 'csv');

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get(`${this.ordersUrl}/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create order from prescription
   */
  createOrderFromPrescription(prescriptionId: string): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.ordersUrl}/from-prescription`, {
      prescriptionId
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Bulk update orders status
   */
  bulkUpdateOrdersStatus(orderIds: string[], newStatus: string): Observable<any> {
    return this.http.put<any>(`${this.ordersUrl}/bulk/status`, {
      orderIds,
      status: newStatus
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get delivery tracking info
   */
  getDeliveryTracking(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.ordersUrl}/${orderId}/delivery-tracking`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Assign delivery person
   */
  assignDeliveryPerson(orderId: string, deliveryPersonId: string): Observable<any> {
    return this.http.put<any>(`${this.ordersUrl}/${orderId}/assign-delivery`, {
      deliveryPersonId
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get recently added prescriptions
   */
  getRecentPrescriptions(limit: number = 5): Observable<any> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('sort', '-createdAt')
      .set('sentToPharmacy', 'true');

    return this.http.get<any>(`${this.prescriptionsUrl}`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
}
