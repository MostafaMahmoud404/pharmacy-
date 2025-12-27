// src/app/components/navbar/navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  isLoggedIn = false;
  currentUser: any = null;
  isPharmacist = false;
  isDoctor = false;
  isCustomer = false;
  isAdmin = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check login status when component loads
    this.checkLoginStatus();

    // Listen for user state changes
    if (this.authService.currentUser$) {
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          console.log('✅ Navbar - User updated:', user?.role);
          this.currentUser = user;
          this.isLoggedIn = !!user;
          this.updateUserRole();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check login status
   */
  checkLoginStatus(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      console.log('✅ User is logged in as:', user.role);
      this.currentUser = user;
      this.isLoggedIn = true;
      this.updateUserRole();
    } else {
      this.isLoggedIn = false;
      this.isPharmacist = false;
      this.isDoctor = false;
      this.isCustomer = false;
    }
  }

  /**
   * Update user role flags
   */
  private updateUserRole(): void {
    if (!this.currentUser) {
      this.isPharmacist = false;
      this.isDoctor = false;
      this.isCustomer = false;
      return;
    }

    const role = (this.currentUser?.role || 'customer').toLowerCase().trim();

    console.log('🔍 Checking role:', role);

    this.isAdmin = role === 'admin';
    this.isPharmacist = role === 'pharmacist' || this.isAdmin;
    this.isDoctor = role === 'doctor';
    this.isCustomer = role === 'customer' || role === 'patient';

    console.log('✅ Role flags:', {
      isDoctor: this.isDoctor,
      isPharmacist: this.isPharmacist,
      isCustomer: this.isCustomer
    });
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  /**
   * Navigate to appropriate dashboard
   */
  goToDashboard(): void {
    console.log('🚀 goToDashboard called - isDoctor:', this.isDoctor);

    if (this.isAdmin) {
      console.log('→ Navigating to Admin Dashboard');
      this.router.navigate(['/admin-dashboard']);
    } else if (this.isPharmacist) {
      console.log('→ Navigating to Pharmacist Dashboard');
      this.router.navigate(['/pharmacist-dashboard']);
    } else if (this.isDoctor) {
      console.log('→ Navigating to Doctor Dashboard');
      this.router.navigate(['/doctor-dashboard']);
    } else {
      console.log('→ Navigating to User Dashboard');
      this.router.navigate(['/user-dashboard']);
    }
    this.closeMobileMenu();
  }

  /**
   * Navigate to products management page (Pharmacist only)
   * ✅ يروح على صفحة إدارة المنتجات (القائمة)، مش الفورم مباشرة
   */
  goToProductsManagement(): void {
    console.log('🚀 Navigating to Products Management Page');
    this.router.navigate(['/pharmacist-dashboard/products']);
    this.closeMobileMenu();
  }

  /**
   * Logout user
   */
  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.isLoggedIn = false;
      this.currentUser = null;
      this.isPharmacist = false;
      this.isDoctor = false;
      this.isCustomer = false;
      this.closeMobileMenu();
      this.router.navigate(['/login']);
    }
  }
}
