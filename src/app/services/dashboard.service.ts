import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, DoctorDashboardStats } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // ✅ Fixed: use plural `/api/doctors` to match backend endpoints
  private base = `${environment.apiUrl}/api/doctors`;

  constructor(private http: HttpClient) { }

  getDoctorDashboard(): Observable<ApiResponse<{ stats: DoctorDashboardStats }>> {
    return this.http.get<ApiResponse<{ stats: DoctorDashboardStats }>>(`${this.base}/dashboard`);
  }
}
