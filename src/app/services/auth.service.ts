// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

// Models
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImage?: string;
  isEmailVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // جلب المستخدم من localStorage عند بدء التطبيق
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // الحصول على قيمة المستخدم الحالي
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // التحقق من تسجيل الدخول
  public get isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // الحصول على الـ Token
  public getToken(): string | null {
    return localStorage.getItem('token');
  }

  // تسجيل مستخدم جديد
  register(data: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        map(response => {
          if (response.success && response.data.token) {
            // حفظ البيانات في localStorage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            this.currentUserSubject.next(response.data.user);
          }
          return response;
        })
      );
  }

  // تسجيل الدخول
  login(data: LoginData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        map(response => {
          if (response.success && response.data.token) {
            // حفظ البيانات في localStorage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            this.currentUserSubject.next(response.data.user);
          }
          return response;
        })
      );
  }

  // تسجيل الخروج
  logout(): void {
    // حذف البيانات من localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // الحصول على معلومات المستخدم الحالي من الـ API
  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  // تحديث الملف الشخصي
  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, data);
  }

  // تغيير كلمة المرور
  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, {
      currentPassword,
      newPassword
    });
  }

  // نسيت كلمة المرور
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  // إعادة تعيين كلمة المرور
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password/${token}`, { password });
  }
}
