import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Doctor,
  ApiResponse,
  Consultation,
  AvailableTime
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) { }

  // Get doctor's own profile
  getMyProfile(): Observable<ApiResponse<{ doctor: Doctor; stats: any }>> {
    return this.http.get<ApiResponse<{ doctor: Doctor; stats: any }>>(
      `${this.apiUrl}/me/profile`
    );
  }

  // Update doctor profile
  updateProfile(data: Partial<Doctor>): Observable<ApiResponse<{ doctor: Doctor }>> {
    return this.http.put<ApiResponse<{ doctor: Doctor }>>(
      `${this.apiUrl}/profile`,
      data
    );
  }

  // Toggle availability
  toggleAvailability(isAvailable: boolean): Observable<ApiResponse<{ isAvailable: boolean }>> {
    return this.http.put<ApiResponse<{ isAvailable: boolean }>>(
      `${this.apiUrl}/availability`,
      { isAvailable }
    );
  }

  // Update available times
  updateAvailableTimes(availableTimes: AvailableTime[]): Observable<ApiResponse<{ availableTimes: AvailableTime[] }>> {
    return this.http.put<ApiResponse<{ availableTimes: AvailableTime[] }>>(
      `${this.apiUrl}/available-times`,
      { availableTimes }
    );
  }

  // Get doctor's consultations
  getMyConsultations(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse<{ consultations: Consultation[] }>> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<{ consultations: Consultation[] }>>(
      `${this.apiUrl}/me/consultations`,
      { params: httpParams }
    );
  }

  // Get upcoming consultations
  getUpcomingConsultations(): Observable<ApiResponse<{ consultations: Consultation[]; count: number }>> {
    return this.http.get<ApiResponse<{ consultations: Consultation[]; count: number }>>(
      `${this.apiUrl}/consultations/upcoming`
    );
  }

  // Upload verification documents
  uploadVerificationDocuments(formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/verification-documents`,
      formData
    );
  }
}
