// English version header
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { DoctorService } from '../../../services/doctor.service';
import { User, Doctor } from '../../../models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <!-- Doctor Info -->
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {{ getInitial() }}
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {{ currentUser?.name || 'Doctor' }}
              <svg *ngIf="doctor?.isVerified" class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </h1>
            <p class="text-gray-600">{{ doctor?.specialty || 'Physician' }}</p>
          </div>
        </div>

        <!-- Availability Toggle -->
        <div class="flex items-center gap-4">
          <div class="text-left">
            <p class="text-sm text-gray-500">Status</p>
            <div class="flex items-center gap-2">
              <span [ngClass]="doctor?.available ? 'text-green-600' : 'text-gray-500'" class="font-semibold">
                {{ doctor?.available ? 'Available Now' : 'Unavailable' }}
              </span>
              <div
                [ngClass]="doctor?.available ? 'bg-green-500' : 'bg-gray-400'"
                class="w-3 h-3 rounded-full animate-pulse"
              ></div>
            </div>
          </div>
          <button
            (click)="toggleAvailability()"
            [disabled]="isTogglingAvailability"
            [ngClass]="doctor?.available
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/30'
              : 'bg-gray-300 hover:bg-gray-400'"
            class="px-6 py-3 rounded-xl font-semibold transition-all shadow-md text-white disabled:opacity-50"
          >
            {{ isTogglingAvailability ? 'Updating...' : (doctor?.available ? 'Available' : 'Unavailable') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  doctor: Doctor | null = null;
  isTogglingAvailability = false;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadDoctorProfile();
  }

  loadDoctorProfile(): void {
    this.doctorService.getMyProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.doctor = response.data.doctor;
        }
      },
      error: (error) => console.error('Error loading doctor profile:', error)
    });
  }

  getInitial(): string {
    return this.currentUser?.name?.charAt(0).toUpperCase() || 'D';
  }

  toggleAvailability(): void {
    if (!this.doctor || this.isTogglingAvailability) return;

    this.isTogglingAvailability = true;
    const newStatus = !this.doctor.available;

    this.doctorService.toggleAvailability(newStatus).subscribe({
      next: (response) => {
        if (response.success && this.doctor) {
          this.doctor.available = newStatus;
        }
        this.isTogglingAvailability = false;
      },
      error: (error) => {
        console.error('Error toggling availability:', error);
        this.isTogglingAvailability = false;
      }
    });
  }
}
