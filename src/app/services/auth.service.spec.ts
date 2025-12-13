// src/app/services/auth.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, AuthResponse, LoginData, RegisterData, User } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const apiUrl = `${environment.apiUrl}/api/auth`;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // ✅ أضفنا HttpClientTestingModule - ده كان ناقص!
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // امسح localStorage قبل كل test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============ Login Tests ============

  describe('login', () => {
    it('should login successfully and save token and user', (done) => {
      const loginData: LoginData = {
        email: 'pharmacist@test.com',
        password: 'password123'
      };

      const mockUser: User = {
        id: '1',
        name: 'Test Pharmacist',
        email: 'pharmacist@test.com',
        phone: '123456789',
        role: 'pharmacist',
        isEmailVerified: true
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: {
          token: 'mock-token-123',
          user: mockUser
        }
      };

      service.login(loginData).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(service.currentUserValue).toEqual(mockUser);
        expect(service.getToken()).toBe('mock-token-123');
        expect(localStorage.getItem('token')).toBe('mock-token-123');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginData);
      req.flush(mockResponse);
    });

    it('should handle login error', (done) => {
      const loginData: LoginData = {
        email: 'test@test.com',
        password: 'wrongpassword'
      };

      service.login(loginData).subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error).toBeTruthy();
          done();
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.error(new ErrorEvent('Unauthorized'), { status: 401 });
    });
  });

  // ============ Register Tests ============

  describe('register', () => {
    it('should register successfully and save token and user', (done) => {
      const registerData: RegisterData = {
        name: 'Test Pharmacist',
        email: 'pharmacist@test.com',
        password: 'password123',
        phone: '123456789',
        role: 'pharmacist'
      };

      const mockUser: User = {
        id: '1',
        name: 'Test Pharmacist',
        email: 'pharmacist@test.com',
        phone: '123456789',
        role: 'pharmacist',
        isEmailVerified: false
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: 'Registration successful',
        data: {
          token: 'mock-token-123',
          user: mockUser
        }
      };

      service.register(registerData).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(service.currentUserValue).toEqual(mockUser);
        expect(service.getToken()).toBe('mock-token-123');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  // ============ Logout Tests ============

  describe('logout', () => {
    it('should clear user data and navigate to login', () => {
      const mockUser: User = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        role: 'pharmacist',
        isEmailVerified: true
      };

      localStorage.setItem('token', 'test-token');
      localStorage.setItem('currentUser', JSON.stringify(mockUser));

      service.logout();

      expect(service.currentUserValue).toBeNull();
      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ============ Getters Tests ============

  describe('getters', () => {
    it('should return isLoggedIn as false when no token', () => {
      expect(service.isLoggedIn).toBe(false);
    });

    it('should return isLoggedIn as true when token and user exist', (done) => {
      const loginData: LoginData = {
        email: 'test@test.com',
        password: 'password123'
      };

      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        role: 'pharmacist',
        isEmailVerified: true
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: {
          token: 'mock-token-123',
          user: mockUser
        }
      };

      service.login(loginData).subscribe(() => {
        expect(service.isLoggedIn).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);
    });
  });

  // ============ Role Check Tests ============

  describe('role checks', () => {
    it('should return true for isPharmacist when role is pharmacist', () => {
      const mockUser: User = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        role: 'pharmacist',
        isEmailVerified: true
      };

      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      (service as any).currentUserSubject.next(mockUser);

      expect(service.isPharmacist()).toBe(true);
    });

    it('should return true for isAdmin when role is admin', () => {
      const mockUser: User = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        role: 'admin',
        isEmailVerified: true
      };

      (service as any).currentUserSubject.next(mockUser);

      expect(service.isAdmin()).toBe(true);
      expect(service.isPharmacist()).toBe(true); // admin يعتبر pharmacist أيضاً
    });

    it('should return false for isPharmacist when role is customer', () => {
      const mockUser: User = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        role: 'customer',
        isEmailVerified: true
      };

      (service as any).currentUserSubject.next(mockUser);

      expect(service.isPharmacist()).toBe(false);
    });

    it('should return true for hasRole with matching role', () => {
      const mockUser: User = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        role: 'pharmacist',
        isEmailVerified: true
      };

      (service as any).currentUserSubject.next(mockUser);

      expect(service.hasRole('pharmacist')).toBe(true);
      expect(service.hasRole('admin')).toBe(false);
    });

    it('should return true for hasAnyRole with matching role', () => {
      const mockUser: User = {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        phone: '123',
        role: 'pharmacist',
        isEmailVerified: true
      };

      (service as any).currentUserSubject.next(mockUser);

      expect(service.hasAnyRole('pharmacist', 'admin')).toBe(true);
      expect(service.hasAnyRole('customer')).toBe(false);
    });
  });

  // ============ API Methods Tests ============

  describe('getMe', () => {
    it('should fetch current user data', (done) => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        role: 'pharmacist',
        isEmailVerified: true
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: 'User data retrieved',
        data: {
          token: 'mock-token',
          user: mockUser
        }
      };

      localStorage.setItem('token', 'mock-token');

      service.getMe().subscribe((response) => {
        expect(response.success).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', (done) => {
      const updateData = { name: 'Updated Name' };

      const mockUser: User = {
        id: '1',
        name: 'Updated Name',
        email: 'test@test.com',
        phone: '123456789',
        role: 'pharmacist',
        isEmailVerified: true
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: 'Profile updated',
        data: {
          token: 'mock-token',
          user: mockUser
        }
      };

      localStorage.setItem('token', 'mock-token');

      service.updateProfile(updateData).subscribe((response) => {
        expect(response.success).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/profile`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('updatePassword', () => {
    it('should update password', (done) => {
      const mockResponse = {
        success: true,
        message: 'Password updated'
      };

      service.updatePassword('oldPassword', 'newPassword').subscribe((response) => {
        expect(response.success).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/password`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password request', (done) => {
      const mockResponse = {
        success: true,
        message: 'Reset link sent'
      };

      service.forgotPassword('test@test.com').subscribe((response) => {
        expect(response.success).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/forgot-password`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });
});
