import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCardsComponent } from '../stats-cards/stats-cards.component';
import { UpcomingConsultationsComponent } from '../upcoming-consultations/upcoming-consultations.component';
import { MyConsultationsComponent } from '../my-consultations/my-consultations.component';
import { DoctorDashboardStats, Consultation } from '../../../models';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-main',
  standalone: true,
  imports: [CommonModule, StatsCardsComponent, UpcomingConsultationsComponent, MyConsultationsComponent],
  template: `
    <div class="p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Loading / Error -->
        <div *ngIf="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-300"></div>
          <p class="text-purple-200 mt-4">جاري التحميل...</p>
        </div>

        <div *ngIf="error" class="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
          <p class="text-red-300">{{ error }}</p>
          <button
            (click)="loadDashboard()"
            class="mt-3 px-4 py-2 bg-red-500/30 text-white rounded-lg hover:bg-red-500/40"
          >
            إعادة المحاولة
          </button>
        </div>

        <!-- Statistics -->
        <app-stats-cards *ngIf="!loading && !error && stats" [stats]="stats"></app-stats-cards>

        <!-- Two column layout: upcoming + my consultations -->
        <div *ngIf="!loading && !error" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div class="lg:col-span-2">
            <app-upcoming-consultations [consultations]="upcoming"></app-upcoming-consultations>
          </div>

          <div>
            <app-my-consultations [consultations]="mine"></app-my-consultations>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardMainComponent implements OnInit {
  loading = false;
  error: string | null = null;
  stats: DoctorDashboardStats | null = null;
  upcoming: Consultation[] = [];
  mine: Consultation[] = [];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDoctorDashboard().subscribe({
      next: (resp) => {
        if (resp.success && resp.data) {
          this.stats = resp.data.stats;
          this.upcoming = resp.data.stats?.upcomingConsultations || [];
          this.mine = resp.data.stats?.recentConsultations || [];
        } else {
          this.error = resp.message || 'فشل تحميل البيانات';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Dashboard load error', err);
        // ✅ Better error handling
        if (err.status === 0) {
          this.error = 'لا يمكن الاتصال بالخادم. تأكد من تشغيل Backend';
        } else if (err.status === 401) {
          this.error = 'يجب تسجيل الدخول أولاً';
        } else if (err.status === 403) {
          this.error = 'ليس لديك صلاحية الوصول';
        } else {
          this.error = err.error?.message || 'خطأ في الاتصال بالخادم';
        }
        this.loading = false;
      }
    });
  }
}
