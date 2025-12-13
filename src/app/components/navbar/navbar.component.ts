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
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // تحقق من حالة تسجيل الدخول عند تحميل الـ component
    this.checkLoginStatus();

    // استمع لتغييرات حالة المستخدم
    if (this.authService.currentUser$) {
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          this.currentUser = user;
          this.isLoggedIn = !!user;
          // تحقق من أن المستخدم صيدلية
          this.isPharmacist = user?.role === 'pharmacist' || user?.role === 'admin';
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkLoginStatus(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser = user;
      this.isLoggedIn = true;
      this.isPharmacist = user?.role === 'pharmacist' || user?.role === 'admin';
    } else {
      this.isLoggedIn = false;
      this.isPharmacist = false;
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  goToDashboard(): void {
    this.router.navigate(['/pharmacist-dashboard']);
    this.closeMobileMenu();
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUser = null;
    this.isPharmacist = false;
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
