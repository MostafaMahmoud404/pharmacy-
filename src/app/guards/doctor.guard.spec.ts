import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DoctorGuard } from './doctor.guard';
import { AuthService } from '../services/auth.service';

describe('DoctorGuard', () => {
  let guard: DoctorGuard;
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      getToken: jasmine.createSpy('getToken'),
      currentUserValue: null
    };

    routerSpy = {
      navigate: jasmine.createSpy('navigate')
    };

    TestBed.configureTestingModule({
      providers: [
        DoctorGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(DoctorGuard);
  });

  it('should allow access for doctor role when token exists', () => {
    authServiceSpy.getToken.and.returnValue('token');
    authServiceSpy.currentUserValue = { id: '1', email: 'doc@example.com', role: 'doctor' } as any;

    const result = guard.canActivate({} as any, { url: '/doctor' } as any);
    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for admin role when token exists', () => {
    authServiceSpy.getToken.and.returnValue('token');
    authServiceSpy.currentUserValue = { id: '2', email: 'admin@example.com', role: 'admin' } as any;

    const result = guard.canActivate({} as any, { url: '/doctor' } as any);
    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when no token or user', () => {
    authServiceSpy.getToken.and.returnValue(null);
    authServiceSpy.currentUserValue = null;

    const state: any = { url: '/doctor' };
    const result = guard.canActivate({} as any, state as any);

    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: state.url } });
  });

  it('should redirect to login when role is not doctor/admin', () => {
    authServiceSpy.getToken.and.returnValue('token');
    authServiceSpy.currentUserValue = { id: '3', email: 'user@example.com', role: 'customer' } as any;

    const result = guard.canActivate({} as any, { url: '/doctor' } as any);
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
