// ✅ doctor-dashboard.component.ts - Enhanced with Full Functionality
// Path: src/app/components/doctor-dashboard/doctor-dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { DoctorService } from '../../services/doctor.service';
import { DayOfWeek } from '../../models/doctor.model';

// Interfaces
interface Consultation {
  _id: string;
  patient?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    id?: string;
  };
  type?: string;
  status?: string;
  date?: string;
  createdAt?: string;
}

interface DoctorDashboardStats {
  overview: {
    totalConsultations?: number;
    completedConsultations?: number;
    rating?: { average: number };
  };
  today: {
    consultations?: number;
  };
  recentConsultations?: Consultation[];
  upcomingConsultations?: Consultation[];
}

interface AvailableTime {
  day: DayOfWeek;
  slots: Array<{
    startTime: string;
    endTime: string;
    isBooked?: boolean;
  }>;
}

interface DoctorProfile {
  user?: {
    name: string;
    email: string;
    phone: string;
    profileImage?: string;
  };
  specialty?: string;
  specialtyArabic?: string;
  licenseNumber?: string;
  qualifications?: Array<{
    title: string;
    institution: string;
    year: number;
  }>;
  experience?: number;
  bio?: string;
  consultationFee?: number;
  consultationTypes?: string[];
  languages?: string[];
  rating?: number;
  totalConsultations?: number;
  isVerified?: boolean;
  isAvailable?: boolean;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  consultationUpdates: boolean;
}

interface PrivacySettings {
  profileVisibility: string;
  showPhone: boolean;
  showEmail: boolean;
}

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  // Properties
  stats: DoctorDashboardStats = {
    overview: {
      totalConsultations: 0,
      completedConsultations: 0,
      rating: { average: 0 }
    },
    today: {
      consultations: 0
    },
    recentConsultations: [],
    upcomingConsultations: []
  };

  isLoading = true;
  isRefreshing = false;
  activeTab = 'dashboard';
  currentUser: any = null;
  Math = Math;

  // Tab loading states
  availableTimes: AvailableTime[] = [];
  doctorProfile: DoctorProfile | null = null;
  allConsultations: Consultation[] = [];
  isLoadingProfile = false;
  isLoadingAvailability = false;
  isLoadingHistory = false;
  isSavingProfile = false;
  isSavingAvailability = false;

  // Password change
  passwordData: PasswordChangeData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isChangingPassword = false;
  passwordError = '';
  passwordSuccess = '';

  // Settings
  notificationSettings: NotificationSettings = {
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    consultationUpdates: true
  };

  privacySettings: PrivacySettings = {
    profileVisibility: 'public',
    showPhone: true,
    showEmail: false
  };

  isSavingNotifications = false;
  isSavingPrivacy = false;

  // Private properties
  private destroy$ = new Subject<void>();
  private refreshInterval: any;

  // Days of week
  daysOfWeek = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ];

  // Status color mapping
  private statusColorMap: { [key: string]: string } = {
    'confirmed': 'confirmed',
    'pending': 'pending',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };

  constructor(
    private dashboardService: DashboardService,
    private doctorService: DoctorService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadDoctorProfile();
    this.loadDashboardData();
    this.loadSettingsFromStorage();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // ==========================================
  // PROFILE MANAGEMENT
  // ==========================================

  private loadDoctorProfile(): void {
    if (!this.currentUser) {
      console.warn('No current user found');
      return;
    }

    // Initialize with current user data
    this.doctorProfile = {
      user: {
        name: this.currentUser.name || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || '',
        profileImage: this.currentUser.avatarUrl || ''
      },
      specialty: this.currentUser.specialty || '',
      specialtyArabic: this.currentUser.specialtyArabic || '',
      licenseNumber: this.currentUser.licenseNumber || '',
      qualifications: this.currentUser.qualifications || [],
      experience: this.currentUser.experience || 0,
      bio: this.currentUser.bio || '',
      consultationFee: this.currentUser.consultationFee || 0,
      consultationTypes: this.currentUser.consultationTypes || [],
      languages: this.currentUser.languages || [],
      rating: this.currentUser.rating || 0,
      totalConsultations: this.currentUser.totalConsultations || 0,
      isVerified: this.currentUser.isVerified || false,
      isAvailable: this.currentUser.available || false
    };

    // Fetch complete profile if needed
    const needsFullProfile = !this.currentUser.specialty || !this.currentUser.bio;

    if (needsFullProfile) {
      this.doctorService.getMyProfile()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response?.data?.doctor) {
              const apiDoctor = response.data.doctor;
              this.doctorProfile = {
                user: {
                  name: apiDoctor.user?.name || this.doctorProfile!.user!.name,
                  email: apiDoctor.user?.email || this.doctorProfile!.user!.email,
                  phone: apiDoctor.user?.phone || this.doctorProfile!.user!.phone,
                  profileImage: apiDoctor.user?.profileImage || this.doctorProfile!.user!.profileImage
                },
                specialty: apiDoctor.specialty || this.doctorProfile!.specialty,
                specialtyArabic: apiDoctor.specialtyArabic || this.doctorProfile!.specialtyArabic,
                licenseNumber: apiDoctor.licenseNumber || this.doctorProfile!.licenseNumber,
                qualifications: apiDoctor.qualifications || this.doctorProfile!.qualifications,
                experience: apiDoctor.experience || this.doctorProfile!.experience,
                bio: apiDoctor.bio || this.doctorProfile!.bio,
                consultationFee: apiDoctor.consultationFee || this.doctorProfile!.consultationFee,
                consultationTypes: apiDoctor.consultationTypes || this.doctorProfile!.consultationTypes,
                languages: apiDoctor.languages || this.doctorProfile!.languages,
                rating: apiDoctor.rating || this.doctorProfile!.rating,
                totalConsultations: apiDoctor.totalConsultations || this.doctorProfile!.totalConsultations,
                isVerified: apiDoctor.isVerified ?? this.doctorProfile!.isVerified,
                isAvailable: apiDoctor.isAvailable ?? this.doctorProfile!.isAvailable
              };
            }
          },
          error: (error: any) => {
            console.error('Failed to load complete profile:', error);
          }
        });
    }
  }

  updateProfile(): void {
    if (!this.doctorProfile) return;

    this.isSavingProfile = true;

    this.doctorService.updateProfile(this.doctorProfile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          alert('✅ Profile updated successfully!');
          this.isSavingProfile = false;

          // Update local user data
          if (response?.data?.doctor) {
            const updatedUser = {
              ...this.currentUser,
              ...response.data.doctor.user,
              ...response.data.doctor
            };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        },
        error: (error: any) => {
          console.error('Update Profile Error:', error);
          alert('❌ Failed to update profile. Please try again.');
          this.isSavingProfile = false;
        }
      });
  }

  // ==========================================
  // DASHBOARD DATA
  // ==========================================

  loadDashboardData(): void {
    this.isLoading = true;

    this.dashboardService.getDoctorDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.handleDashboardResponse(response);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Dashboard Error:', error);
          this.isLoading = false;
        }
      });
  }

  private handleDashboardResponse(response: any): void {
    if (response?.data?.stats) {
      this.stats = response.data.stats;
    } else if (response?.stats) {
      this.stats = response.stats;
    }

    if (!this.stats.overview) {
      this.stats.overview = {
        totalConsultations: 0,
        completedConsultations: 0,
        rating: { average: 0 }
      };
    }
    if (!this.stats.today) {
      this.stats.today = { consultations: 0 };
    }
    if (!this.stats.upcomingConsultations) {
      this.stats.upcomingConsultations = [];
    }
  }

  private setupAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshDashboard();
    }, 5 * 60 * 1000);
  }

  refreshDashboard(): void {
    this.isRefreshing = true;

    this.dashboardService.getDoctorDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.handleDashboardResponse(response);
          this.isRefreshing = false;
        },
        error: (error: any) => {
          console.error('Refresh Error:', error);
          this.isRefreshing = false;
        }
      });
  }

  // ==========================================
  // TAB MANAGEMENT
  // ==========================================

  setActiveTab(tab: string): void {
    this.activeTab = tab;

    switch (tab) {
      case 'availability':
        this.loadAvailability();
        break;
      case 'profile':
        // Profile already loaded
        break;
      case 'history':
        this.loadHistory();
        break;
      case 'settings':
        // Settings already loaded
        break;
    }
  }

  // ==========================================
  // AVAILABILITY MANAGEMENT
  // ==========================================

  loadAvailability(): void {
    this.isLoadingAvailability = true;

    this.doctorService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response?.data?.doctor) {
            this.availableTimes = response.data.doctor.availableTimes || [];

            // Initialize empty slots for days without availability
            this.daysOfWeek.forEach(day => {
              if (!this.availableTimes.find(at => at.day === day.value)) {
                this.availableTimes.push({
                  day: day.value as DayOfWeek,
                  slots: []
                });
              }
            });
          }
          this.isLoadingAvailability = false;
        },
        error: (error: any) => {
          console.error('Availability Error:', error);
          this.isLoadingAvailability = false;
        }
      });
  }

  addTimeSlot(day: string): void {
    const daySchedule = this.availableTimes.find(at => at.day === day);
    if (daySchedule) {
      daySchedule.slots.push({
        startTime: '09:00',
        endTime: '10:00',
        isBooked: false
      });
    } else {
      this.availableTimes.push({
        day: day as DayOfWeek,
        slots: [{
          startTime: '09:00',
          endTime: '10:00',
          isBooked: false
        }]
      });
    }
  }

  removeTimeSlot(day: string, index: number): void {
    const daySchedule = this.availableTimes.find(at => at.day === day);
    if (daySchedule) {
      daySchedule.slots.splice(index, 1);
    }
  }

  saveAvailability(): void {
    this.isSavingAvailability = true;

    // Filter out days with no slots
    const availableTimesToSave = this.availableTimes.filter(at => at.slots.length > 0);

    // Validate time slots
    for (const daySchedule of availableTimesToSave) {
      for (const slot of daySchedule.slots) {
        if (!slot.startTime || !slot.endTime) {
          alert('❌ Please fill all time slots');
          this.isSavingAvailability = false;
          return;
        }
        if (slot.startTime >= slot.endTime) {
          alert('❌ End time must be after start time');
          this.isSavingAvailability = false;
          return;
        }
      }
    }

    this.doctorService.updateAvailableTimes(availableTimesToSave)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          alert('✅ Availability saved successfully!');
          this.isSavingAvailability = false;
        },
        error: (error: any) => {
          console.error('Save Availability Error:', error);
          alert('❌ Failed to save availability. Please try again.');
          this.isSavingAvailability = false;
        }
      });
  }

  getDayLabel(day: string): string {
    const dayObj = this.daysOfWeek.find(d => d.value === day);
    return dayObj ? dayObj.label : day;
  }

  getSlotsForDay(day: string): any[] {
    const daySchedule = this.availableTimes.find(at => at.day === day);
    return daySchedule ? daySchedule.slots : [];
  }

  // ==========================================
  // CONSULTATION HISTORY
  // ==========================================

  loadHistory(): void {
    this.isLoadingHistory = true;

    this.doctorService.getMyConsultations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response?.data?.consultations) {
            this.allConsultations = response.data.consultations;
          }
          this.isLoadingHistory = false;
        },
        error: (error: any) => {
          console.error('History Error:', error);
          this.isLoadingHistory = false;
        }
      });
  }

  // ==========================================
  // PASSWORD CHANGE
  // ==========================================

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    // Validation
    if (!this.passwordData.currentPassword || !this.passwordData.newPassword || !this.passwordData.confirmPassword) {
      this.passwordError = 'All fields are required';
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters';
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.passwordError = 'New passwords do not match';
      return;
    }

    this.isChangingPassword = true;

    this.authService.updatePassword(this.passwordData.currentPassword, this.passwordData.newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.passwordSuccess = '✅ Password changed successfully!';
          this.isChangingPassword = false;

          // Clear form
          this.passwordData = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };

          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            this.passwordSuccess = '';
          }, 3000);
        },
        error: (error: any) => {
          console.error('Change Password Error:', error);
          this.passwordError = error.message || '❌ Failed to change password';
          this.isChangingPassword = false;
        }
      });
  }

  // ==========================================
  // SETTINGS MANAGEMENT
  // ==========================================

  private loadSettingsFromStorage(): void {
    try {
      const storedNotifications = localStorage.getItem('notificationSettings');
      const storedPrivacy = localStorage.getItem('privacySettings');

      if (storedNotifications) {
        this.notificationSettings = JSON.parse(storedNotifications);
      }

      if (storedPrivacy) {
        this.privacySettings = JSON.parse(storedPrivacy);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  saveNotificationSettings(): void {
    this.isSavingNotifications = true;

    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));

      setTimeout(() => {
        alert('✅ Notification settings saved successfully!');
        this.isSavingNotifications = false;
      }, 500);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('❌ Failed to save settings');
      this.isSavingNotifications = false;
    }
  }

  savePrivacySettings(): void {
    this.isSavingPrivacy = true;

    try {
      localStorage.setItem('privacySettings', JSON.stringify(this.privacySettings));

      setTimeout(() => {
        alert('✅ Privacy settings saved successfully!');
        this.isSavingPrivacy = false;
      }, 500);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      alert('❌ Failed to save settings');
      this.isSavingPrivacy = false;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  getPatientName(consultation: Consultation): string {
    if (!consultation.patient) return 'Unknown Patient';

    const patient = consultation.patient;

    if (typeof patient === 'string') {
      return 'Patient';
    }

    if (patient.name) return patient.name;
    if (patient.firstName && patient.lastName) {
      return `${patient.firstName} ${patient.lastName}`;
    }
    if (patient.firstName) return patient.firstName;
    return 'Unknown Patient';
  }

  getPatientInitials(consultation: Consultation): string {
    const name = this.getPatientName(consultation);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getConsultationType(type?: string): string {
    const typeMap: { [key: string]: string } = {
      'video': 'Video Call',
      'audio': 'Audio Call',
      'chat': 'Chat',
      'in-person': 'In-Person'
    };
    return typeMap[type?.toLowerCase() || ''] || 'Consultation';
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const consultDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      if (consultDate.getTime() === today.getTime()) {
        return `Today, ${timeStr}`;
      } else if (consultDate.getTime() === today.getTime() + 86400000) {
        return `Tomorrow, ${timeStr}`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (error) {
      console.error('Date Format Error:', error);
      return '';
    }
  }

  getStatusClass(status?: string): string {
    const statusLower = (status || 'pending').toLowerCase();
    return `status-badge ${this.statusColorMap[statusLower] || 'pending'}`;
  }

  getStatusText(status?: string): string {
    const statusMap: { [key: string]: string } = {
      'confirmed': 'Confirmed',
      'pending': 'Pending',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status?.toLowerCase() || ''] || 'Pending';
  }

  getUpcomingConsultations(): Consultation[] {
    return this.stats.upcomingConsultations || [];
  }

  viewConsultationDetails(consultation: Consultation): void {
    if (consultation._id) {
      console.log('View consultation:', consultation._id);
      alert(`Viewing consultation details for ${this.getPatientName(consultation)}`);
    }
  }

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
