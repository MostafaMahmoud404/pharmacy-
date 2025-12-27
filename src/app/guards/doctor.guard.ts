import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DoctorGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.getToken();
    const user = this.authService.currentUserValue;

    console.log('🔐 DoctorGuard - Checking access');
    console.log('   Token exists:', !!token);
    console.log('   User:', user?.email);
    console.log('   User Role:', user?.role);
    console.log('   URL:', state.url);

    if (!token || !user) {
      console.log('❌ DoctorGuard - Not authenticated (no token or user)');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Normalize role - remove whitespace and convert to lowercase
    const userRole = (user.role || '').trim().toLowerCase();

    console.log('   Normalized Role:', userRole);

    // Allow doctors and admins
    if (userRole === 'doctor' || userRole === 'admin') {
      console.log('✅ DoctorGuard - Access GRANTED (Doctor or Admin)');
      return true;
    }

    // Unauthorized role
    console.error(`❌ DoctorGuard - Access DENIED. User role is: "${userRole}" (expected: "doctor" or "admin")`);
    this.router.navigate(['/']);
    return false;
  }
}
