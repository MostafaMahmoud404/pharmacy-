// src/app/guards/pharmacist.guard.spec.ts

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PharmacistGuard } from './pharmacist.guard';
import { AuthService, User } from '../services/auth.service';

describe('PharmacistGuard', () => {
  let guard: PharmacistGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // ✅ أضفنا currentUserValue كـ property spy
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken'], {
      currentUserValue: null as User | null
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        PharmacistGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(PharmacistGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access when user is pharmacist', () => {
    const mockUser: User = {
      id: '1',
      email: 'pharmacist@test.com',
      name: 'Pharmacist',
      role: 'pharmacist',
      phone: '123456789',
      isEmailVerified: true
    };

    // ✅ استخدام Object.defineProperty للـ property spy
    Object.defineProperty(authService, 'currentUserValue', {
      get: jasmine.createSpy('currentUserValue').and.returnValue(mockUser),
      configurable: true
    });
    authService.getToken.and.returnValue('mock-token');

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/pharmacist-dashboard' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access when user is admin', () => {
    const mockUser: User = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'admin',
      phone: '123456789',
      isEmailVerified: true
    };

    Object.defineProperty(authService, 'currentUserValue', {
      get: jasmine.createSpy('currentUserValue').and.returnValue(mockUser),
      configurable: true
    });
    authService.getToken.and.returnValue('mock-token');

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/pharmacist-dashboard' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access when no token exists', () => {
    Object.defineProperty(authService, 'currentUserValue', {
      get: jasmine.createSpy('currentUserValue').and.returnValue(null),
      configurable: true
    });
    authService.getToken.and.returnValue(null);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/pharmacist-dashboard' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: { returnUrl: '/pharmacist-dashboard' } })
    );
  });

  it('should deny access when user data is null', () => {
    Object.defineProperty(authService, 'currentUserValue', {
      get: jasmine.createSpy('currentUserValue').and.returnValue(null),
      configurable: true
    });
    authService.getToken.and.returnValue('mock-token');

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/pharmacist-dashboard' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: { returnUrl: '/pharmacist-dashboard' } })
    );
  });

  it('should deny access when user role is not pharmacist or admin', () => {
    const mockUser: User = {
      id: '1',
      email: 'customer@test.com',
      name: 'Customer',
      role: 'customer',
      phone: '123456789',
      isEmailVerified: true
    };

    Object.defineProperty(authService, 'currentUserValue', {
      get: jasmine.createSpy('currentUserValue').and.returnValue(mockUser),
      configurable: true
    });
    authService.getToken.and.returnValue('mock-token');

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/pharmacist-dashboard' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
