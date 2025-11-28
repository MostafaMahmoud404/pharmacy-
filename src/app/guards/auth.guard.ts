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
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      // تحقق من الـ roles إذا كانت موجودة في الـ route
      if (route.data['roles'] && route.data['roles'].indexOf(currentUser.role) === -1) {
        // الدور غير مسموح
        this.router.navigate(['/']);
        return false;
      }

      // المستخدم مسجل دخول
      return true;
    }

    // المستخدم غير مسجل دخول، إعادة توجيه لصفحة Login
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
