import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Consultation } from '../../../models';

@Component({
  selector: 'app-my-consultations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
      <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        استشاراتي
      </h2>

      <div class="overflow-x-auto" *ngIf="consultations && consultations.length > 0; else noData">
        <table class="w-full">
          <thead>
            <tr class="border-b-2 border-white/10">
              <th class="text-right p-4 font-semibold text-purple-200">المريض</th>
              <th class="text-right p-4 font-semibold text-purple-200">نوع الجلسة</th>
              <th class="text-right p-4 font-semibold text-purple-200">الحالة</th>
              <th class="text-right p-4 font-semibold text-purple-200">التاريخ</th>
              <th class="text-right p-4 font-semibold text-purple-200">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let consultation of consultations"
              class="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {{ getPatientInitial(consultation) }}
                  </div>
                  <span class="font-medium text-white">{{ getPatientName(consultation) }}</span>
                </div>
              </td>
              <td class="p-4 text-purple-100">{{ getTypeLabel(consultation.type) }}</td>
              <td class="p-4">
                <span [ngClass]="getStatusClass(consultation.status)" class="px-3 py-1 rounded-full text-sm font-medium">
                  {{ getStatusLabel(consultation.status) }}
                </span>
              </td>
              <td class="p-4 text-purple-100">{{ formatDate(consultation.createdAt) }}</td>
              <td class="p-4">
                <button
                  (click)="viewDetails(consultation._id)"
                  class="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                >
                  التفاصيل
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #noData>
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-purple-300 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-purple-200">لا توجد استشارات سابقة</p>
        </div>
      </ng-template>
    </div>
  `
})
export class MyConsultationsComponent {
  @Input() consultations: Consultation[] | null = null;

  constructor(private router: Router) { }

  getPatientInitial(consultation: Consultation): string {
    const patient = consultation.patient as any;
    if (!patient) return 'م';
    if (typeof patient === 'string') return 'م';
    return (patient?.name?.charAt(0).toUpperCase()) || 'م';
  }

  getPatientName(consultation: Consultation): string {
    const patient = consultation.patient as any;
    if (!patient) return 'مريض';
    if (typeof patient === 'string') return 'مريض';
    return patient?.name || 'مريض';
  }

  formatDate(date?: Date | string): string {
    if (!date) return '';
    const d = new Date(date as any);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTypeLabel(type?: string): string {
    const types: Record<string, string> = {
      'video': 'فيديو',
      'audio': 'صوت',
      'chat': 'محادثة'
    };
    if (!type) return '';
    return types[type] || type;
  }

  getStatusLabel(status?: string): string {
    const statuses: Record<string, string> = {
      'pending': 'معلق',
      'confirmed': 'مؤكد',
      'in-progress': 'جاري',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    if (!status) return '';
    return statuses[status] || status;
  }

  getStatusClass(status?: string): string {
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-300',
      'confirmed': 'bg-green-500/20 text-green-300',
      'in-progress': 'bg-blue-500/20 text-blue-300',
      'completed': 'bg-green-500/20 text-green-300',
      'cancelled': 'bg-red-500/20 text-red-300'
    };
    if (!status) return 'bg-gray-500/20 text-gray-300';
    return classes[status] || 'bg-gray-500/20 text-gray-300';
  }

  viewDetails(id?: string): void {
    if (!id) return;
    this.router.navigate(['/dashboard/consultations', id]);
  }
}
