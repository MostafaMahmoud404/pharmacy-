import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorDashboardStats } from '../../../models';

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div
        *ngFor="let stat of statsData"
        class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:scale-105 transition-transform cursor-pointer"
      >
        <div [ngClass]="stat.bg" class="w-12 h-12 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="stat.icon" />
          </svg>
        </div>
        <p class="text-gray-600 text-sm mb-1">{{ stat.label }}</p>
        <p class="text-3xl font-bold text-gray-800">{{ stat.value }}</p>
      </div>
    </div>
  `
})
export class StatsCardsComponent {
  @Input() stats: DoctorDashboardStats | null = null;

  get statsData() {
    if (!this.stats) return [];

    return [
      {
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        label: 'Total Consultations',
        value: this.stats.overview.totalConsultations,
        bg: 'bg-gradient-to-br from-blue-500 to-cyan-500'
      },
      {
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        label: 'Completed Consultations',
        value: this.stats.overview.completedConsultations,
        bg: 'bg-gradient-to-br from-green-500 to-emerald-500'
      },
      {
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        label: 'Today Consultations',
        value: this.stats.today.consultations,
        bg: 'bg-gradient-to-br from-purple-500 to-pink-500'
      },
      {
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        label: 'Rating',
        value: `${((this.stats?.overview?.rating?.average) ?? 0).toFixed(1)} ⭐`,
        bg: 'bg-gradient-to-br from-orange-500 to-yellow-500'
      }
    ];
  }
}
