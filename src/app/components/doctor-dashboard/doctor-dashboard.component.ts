import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent {
  activeTab: 'dashboard' | 'availability' | 'profile' | 'settings' = 'dashboard';
  currentUser: any;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.currentUserValue;

    // Check if user is doctor or admin
    if (!this.currentUser || (this.currentUser.role !== 'doctor' && this.currentUser.role !== 'admin')) {
      this.router.navigate(['/login']);
    }
  }

  setActiveTab(tab: 'dashboard' | 'availability' | 'profile' | 'settings'): void {
    this.activeTab = tab;
  }

  logout(): void {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      this.authService.logout();
    }
  }

}
