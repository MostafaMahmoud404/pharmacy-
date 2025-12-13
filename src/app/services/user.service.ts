import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Get user prescriptions
  getPrescriptions(userId?: string): Observable<any> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get(`${this.apiUrl}/api/prescriptions`, { params });
  }

  // Get user orders
  getOrders(userId?: string): Observable<any> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get(`${this.apiUrl}/api/orders`, { params });
  }

  // Get user consultations
  getConsultations(userId?: string): Observable<any> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get(`${this.apiUrl}/api/consultations`, { params });
  }

  // Upload prescription
  uploadPrescription(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('prescription', file);
    return this.http.post(`${this.apiUrl}/api/prescriptions/upload`, formData);
  }

  // Send prescription to pharmacy
  sendToPharmacy(prescriptionId: string, pharmacyId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/prescriptions/${prescriptionId}/send`, {
      pharmacyId
    });
  }

  // Track order
  trackOrder(orderId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/orders/${orderId}/track`);
  }

  // Cancel order
  cancelOrder(orderId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/orders/${orderId}/cancel`, {
      reason
    });
  }

  // Update profile
  updateProfile(data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/user/profile`, data);
  }

  // Update password
  updatePassword(payload: { currentPassword: string; newPassword: string }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/user/password`, payload);
  }
}
