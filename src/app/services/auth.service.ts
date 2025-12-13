// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'pharmacist' | 'admin' | 'customer' | 'doctor' | string;
  profileImage?: string;
  isEmailVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    doctor?: {
      id: string;
      specialty: string;
      licenseNumber: string;
    };
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: string;
}

export interface RegisterDoctorData extends RegisterData {
  specialty: string;
  specialtyArabic: string;
  licenseNumber: string;
  experience: number;
  consultationFee: number;
}

export interface LoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ✅ تأكد أن environment.apiUrl هو http://localhost:3000 بدون /api
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private readonly STORAGE_TOKEN_KEY = 'token';
  private readonly STORAGE_USER_KEY = 'currentUser';

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('Auth Service - API URL:', this.apiUrl);
    const storedUser = this.getUserFromStorage();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private getUserFromStorage(): User | null {
    try {
      const userStr = localStorage.getItem(this.STORAGE_USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from storage:', error);
      this.clearStorage();
      return null;
    }
  }

  private saveToStorage(token: string, user: User): void {
    try {
      localStorage.setItem(this.STORAGE_TOKEN_KEY, token);
      localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_TOKEN_KEY);
      localStorage.removeItem(this.STORAGE_USER_KEY);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
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

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUserValue;
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Register a new customer user
   * @param data - Customer registration data
   */
  register(data: RegisterData): Observable<AuthResponse> {
    console.log('Registering user at:', `${this.apiUrl}/register`, data);
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap(response => {
          if (response.success && response.data?.token && response.data?.user) {
            this.saveToStorage(response.data.token, response.data.user);
            console.log('✅ Registration successful:', response.data.user.email);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Register a new doctor user with file upload
   * @param formData - FormData containing doctor data and license file
   */
  registerDoctor(formData: FormData): Observable<AuthResponse> {
    console.log('Registering doctor with file at:', `${this.apiUrl}/register-doctor`);
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-doctor`, formData)
      .pipe(
        tap(response => {
          if (response.success && response.data?.token && response.data?.user) {
            this.saveToStorage(response.data.token, response.data.user);
            console.log('✅ Doctor registration successful:', response.data.user.email);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Login user
   * @param data - Login credentials (email and password)
   */
  login(data: LoginData): Observable<AuthResponse> {
    console.log('Logging in at:', `${this.apiUrl}/login`, data);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          if (response.success && response.data?.token && response.data?.user) {
            this.saveToStorage(response.data.token, response.data.user);
            console.log('✅ Login successful:', response.data.user.email);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Logout current user
   */
  logout(): void {
    console.log('Logging out user');
    this.clearStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Get current user details
   */
  getMe(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/me`)
      .pipe(
        tap(response => {
          if (response.success && response.data?.user) {
            const token = this.getToken();
            if (token) {
              this.saveToStorage(token, response.data.user);
            }
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Update user profile
   * @param data - Profile data to update
   */
  updateProfile(data: any): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/profile`, data)
      .pipe(
        tap(response => {
          if (response.success && response.data?.user) {
            const token = this.getToken();
            if (token) {
              this.saveToStorage(token, response.data.user);
            }
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Update user password
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, {
      currentPassword,
      newPassword
    })
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Request password reset email
   * @param email - User email address
   */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email })
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Reset password with token
   * @param token - Reset token from email
   * @param password - New password
   */
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password/${token}`, { password })
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Verify email with token
   * @param token - Verification token from email
   */
  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify-email/${token}`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Resend verification email
   */
  resendVerification(): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, {})
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Check if current user is a pharmacist
   */
  isPharmacist(): boolean {
    const user = this.currentUserValue;
    return user?.role === 'pharmacist' || user?.role === 'admin';
  }

  /**
   * Check if current user is a doctor
   */
  isDoctor(): boolean {
    const user = this.currentUserValue;
    return user?.role === 'doctor';
  }

  /**
   * Check if current user is an admin
   */
  isAdmin(): boolean {
    const user = this.currentUserValue;
    return user?.role === 'admin';
  }

  /**
   * Check if current user has a specific role
   * @param role - Role to check
   */
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user?.role === role;
  }

  /**
   * Check if current user has any of the provided roles
   * @param roles - Array of roles to check
   */
  hasAnyRole(...roles: string[]): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    return roles.includes(user.role);
  }
}
