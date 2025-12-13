import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../services/doctor.service';
import { AvailableTime, TimeSlot, DayOfWeek } from '../../../models';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
      <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        المواعيد ووقت العمل
      </h2>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-300"></div>
        <p class="text-purple-200 mt-4">جارٍ التحميل...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !isLoading" class="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
        <p class="text-red-300">{{ errorMessage }}</p>
      </div>

      <!-- Availability Schedule -->
      <div *ngIf="!isLoading && !errorMessage" class="space-y-4">
        <div
          *ngFor="let daySchedule of availableTimes; let dayIndex = index"
          class="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-white text-lg">{{ getDayLabel(daySchedule.day) }}</h3>
            <button
              (click)="addTimeSlot(dayIndex)"
              class="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
              [disabled]="isSaving"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <!-- Time Slots -->
          <div class="space-y-2">
            <div
              *ngFor="let slot of daySchedule.slots; let slotIndex = index"
              class="flex items-center gap-3 bg-white/5 p-3 rounded-lg"
            >
              <!-- Start Time -->
              <div class="flex-1">
                <label class="text-xs text-purple-200 mb-1 block">من</label>
                <input
                  type="time"
                  [(ngModel)]="slot.startTime"
                  (change)="onSlotChange()"
                  class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  [disabled]="isSaving"
                />
              </div>

              <!-- End Time -->
              <div class="flex-1">
                <label class="text-xs text-purple-200 mb-1 block">إلى</label>
                <input
                  type="time"
                  [(ngModel)]="slot.endTime"
                  (change)="onSlotChange()"
                  class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  [disabled]="isSaving"
                />
              </div>

              <!-- Delete Button -->
              <button
                (click)="removeTimeSlot(dayIndex, slotIndex)"
                class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors mt-5"
                [disabled]="isSaving"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <!-- Empty State -->
            <div *ngIf="daySchedule.slots.length === 0" class="text-center py-4">
              <p class="text-purple-200 text-sm">لا توجد مواعيد لهذا اليوم</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div *ngIf="!isLoading && !errorMessage && hasChanges" class="mt-6 flex justify-end gap-3">
        <button
          (click)="resetChanges()"
          class="px-6 py-3 bg-gray-500/30 text-white rounded-xl hover:bg-gray-500/40 transition-all"
          [disabled]="isSaving"
        >
          إلغاء
        </button>
        <button
          (click)="saveAvailability()"
          class="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50"
          [disabled]="isSaving"
        >
          {{ isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات' }}
        </button>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="mt-4 bg-green-500/20 border border-green-500/50 rounded-xl p-4">
        <p class="text-green-300">{{ successMessage }}</p>
      </div>
    </div>
  `
})
export class AvailabilityComponent implements OnInit {
  availableTimes: AvailableTime[] = [];
  originalAvailableTimes: AvailableTime[] = [];
  isLoading = true;
  isSaving = false;
  hasChanges = false;
  errorMessage = '';
  successMessage = '';

  daysOfWeek: { key: DayOfWeek; label: string }[] = [
    { key: 'sunday', label: 'الأحد' },
    { key: 'monday', label: 'الاثنين' },
    { key: 'tuesday', label: 'الثلاثاء' },
    { key: 'wednesday', label: 'الأربعاء' },
    { key: 'thursday', label: 'الخميس' },
    { key: 'friday', label: 'الجمعة' },
    { key: 'saturday', label: 'السبت' }
  ];

  constructor(private doctorService: DoctorService) { }

  ngOnInit(): void {
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.doctorService.getMyProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const doctor = response.data.doctor;

          // Initialize available times for all days
          this.availableTimes = this.daysOfWeek.map(day => {
            const existingDay = doctor.availableTimes?.find(t => t.day === day.key);
            return existingDay || { day: day.key, slots: [] };
          });

          // Keep a copy for reset
          this.originalAvailableTimes = JSON.parse(JSON.stringify(this.availableTimes));
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'حدث خطأ في تحميل البيانات';
        this.isLoading = false;
      }
    });
  }

  getDayLabel(day: DayOfWeek): string {
    const dayObj = this.daysOfWeek.find(d => d.key === day);
    return dayObj?.label || day;
  }

  addTimeSlot(dayIndex: number): void {
    const newSlot: TimeSlot = {
      startTime: '09:00',
      endTime: '10:00',
      isBooked: false
    };
    this.availableTimes[dayIndex].slots.push(newSlot);
    this.onSlotChange();
  }

  removeTimeSlot(dayIndex: number, slotIndex: number): void {
    this.availableTimes[dayIndex].slots.splice(slotIndex, 1);
    this.onSlotChange();
  }

  onSlotChange(): void {
    this.hasChanges = true;
    this.successMessage = '';
  }

  resetChanges(): void {
    this.availableTimes = JSON.parse(JSON.stringify(this.originalAvailableTimes));
    this.hasChanges = false;
    this.successMessage = '';
  }

  saveAvailability(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Filter out days with no slots
    const dataToSave = this.availableTimes.filter(day => day.slots.length > 0);

    this.doctorService.updateAvailableTimes(dataToSave).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'تم حفظ المواعيد بنجاح';
          this.hasChanges = false;
          this.originalAvailableTimes = JSON.parse(JSON.stringify(this.availableTimes));

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }
        this.isSaving = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'حدث خطأ في حفظ البيانات';
        this.isSaving = false;
      }
    });
  }
}
