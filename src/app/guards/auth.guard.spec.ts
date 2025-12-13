// src/app/guards/auth.guard.ts

import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // ✅ استخدم currentUserValue بدل getCurrentUser()
    const currentUser = this.authService.currentUserValue;
    const token = this.authService.getToken();

    // تحقق من وجود المستخدم والـ Token
    if (!currentUser || !token) {
      console.warn('User not authenticated - redirecting to login');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // تحقق من الـ roles إذا كانت موجودة في الـ route
    if (route.data && route.data['roles']) {
      const allowedRoles = route.data['roles'] as string[];

      // تحقق من أن دور المستخدم موجود في الأدوار المسموحة
      if (allowedRoles.includes(currentUser.role)) {
        return true;
      }

      // الدور غير مسموح
      console.warn('User role not authorized for this route. User role:', currentUser.role);
      this.router.navigate(['/']);
      return false;
    }

    // المستخدم مسجل دخول والدور مسموح (أو ما فيش تحديد أدوار)
    return true;
  }
}
