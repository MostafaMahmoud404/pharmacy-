// src/app/guards/pharmacist.guard.ts

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PharmacistGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // احصل على الـ Token
    const token = this.authService.getToken();

    // ✅ استخدم currentUserValue بدل getCurrentUser()
    const user = this.authService.currentUserValue;

    // تحقق من وجود الـ Token والمستخدم
    if (!token || !user) {
      console.warn('No token or user data found - redirecting to login');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // تحقق من أن المستخدم صيدلاني أو إداري
    if (user.role === 'pharmacist' || user.role === 'admin') {
      console.log('Access granted to:', user.email, '- Role:', user.role);
      return true;
    }

    // الدور غير مسموح
    console.warn('User role not authorized - Access denied. User role:', user.role);
    this.router.navigate(['/login']);
    return false;
  }
}
