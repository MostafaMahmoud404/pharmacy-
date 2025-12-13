import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../services/doctor.service';
import { Doctor, Qualification } from '../../../models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
      <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        الملف الشخصي والتوثيق
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

      <!-- Profile Form & Verification -->
      <div *ngIf="!isLoading && doctor" class="grid md:grid-cols-2 gap-6">

        <!-- Left Side - Profile Info -->
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-white mb-4">البيانات الشخصية</h3>

          <!-- Specialty Arabic -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">التخصص بالعربية</label>
            <input
              type="text"
              [(ngModel)]="doctor.specialtyArabic"
              (ngModelChange)="onProfileChange()"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              [disabled]="isSaving"
            />
          </div>

          <!-- Experience -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">سنوات الخبرة</label>
            <input
              type="number"
              [(ngModel)]="doctor.experience"
              (ngModelChange)="onProfileChange()"
              min="0"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              [disabled]="isSaving"
            />
          </div>

          <!-- Bio -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">نبذة مختصرة</label>
            <textarea
              [(ngModel)]="doctor.bio"
              (ngModelChange)="onProfileChange()"
              rows="4"
              maxlength="1000"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              [disabled]="isSaving"
              placeholder="اكتب نبذة مختصرة عنك..."
            ></textarea>
            <p class="text-xs text-purple-300 mt-1">{{ doctor.bio?.length || 0 }} / 1000</p>
          </div>

          <!-- Consultation Fee -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">رسوم الاستشارة (ج.م)</label>
            <input
              type="number"
              [(ngModel)]="doctor.consultationFee"
              (ngModelChange)="onProfileChange()"
              min="0"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              [disabled]="isSaving"
            />
          </div>

          <!-- Languages -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">اللغات</label>
            <div class="flex flex-wrap gap-2">
              <label *ngFor="let lang of availableLanguages" class="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  [checked]="doctor.languages?.includes(lang.value)"
                  (change)="toggleLanguage(lang.value)"
                  class="rounded text-pink-500 focus:ring-pink-500"
                  [disabled]="isSaving"
                />
                <span class="text-white">{{ lang.label }}</span>
              </label>
            </div>
          </div>

          <!-- Consultation Types -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">أنواع الاستشارات</label>
            <div class="flex flex-wrap gap-2">
                <label *ngFor="let type of consultationTypesList" class="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  [checked]="doctor.consultationTypes?.includes(type.value)"
                  (change)="toggleConsultationType(type.value)"
                  class="rounded text-pink-500 focus:ring-pink-500"
                  [disabled]="isSaving"
                />
                <span class="text-white">{{ type.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Right Side - Verification -->
        <div>
          <h3 class="text-lg font-bold text-white mb-4">التوثيق</h3>

          <!-- Verification Status -->
          <div class="mb-6 p-4 rounded-xl" [ngClass]="doctor.isVerified ? 'bg-green-500/20 border border-green-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'">
            <div class="flex items-center gap-2 mb-2">
              <svg *ngIf="doctor.isVerified" class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg *ngIf="!doctor.isVerified" class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span [ngClass]="doctor.isVerified ? 'text-green-300' : 'text-yellow-300'" class="font-semibold">
                {{ doctor.isVerified ? 'حسابك موثّق' : 'في انتظار التوثيق' }}
              </span>
            </div>
            <p [ngClass]="doctor.isVerified ? 'text-green-200' : 'text-yellow-200'" class="text-sm">
              {{ doctor.isVerified ? 'يمكنك الآن استقبال الاستشارات' : 'قم برفع الوثائق المطلوبة للتوثيق' }}
            </p>
          </div>

          <!-- Upload Documents -->
          <div class="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-pink-500/50 transition-colors">
            <svg class="w-12 h-12 text-purple-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-white mb-2">رفع وثائق التوثيق</p>
            <p class="text-sm text-purple-200 mb-4">PDF أو صور (حد أقصى 5 ملفات)</p>

            <input
              type="file"
              #fileInput
              (change)="onFileSelect($event)"
              multiple
              accept="image/*,.pdf"
              class="hidden"
            />

            <button
              (click)="fileInput.click()"
              class="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50"
              [disabled]="isUploading"
            >
              {{ isUploading ? 'جارٍ الرفع...' : 'اختر الملفات' }}
            </button>

            <!-- Selected Files -->
            <div *ngIf="selectedFiles.length > 0" class="mt-4 text-left">
              <p class="text-sm text-purple-200 mb-2">الملفات المحددة:</p>
              <div class="space-y-1">
                <div *ngFor="let file of selectedFiles; let i = index" class="flex items-center justify-between text-sm bg-white/5 px-3 py-2 rounded">
                  <span class="text-white truncate">{{ file.name }}</span>
                  <button (click)="removeFile(i)" class="text-red-400 hover:text-red-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                (click)="uploadDocuments()"
                class="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                [disabled]="isUploading"
              >
                رفع الملفات
              </button>
            </div>
          </div>

          <!-- Uploaded Documents -->
          <div *ngIf="doctor.verificationDocuments && doctor.verificationDocuments.length > 0" class="mt-6">
            <h4 class="text-white font-semibold mb-3">المستندات المرفوعة:</h4>
            <div class="space-y-2">
              <div *ngFor="let doc of doctor.verificationDocuments" class="flex items-center justify-between bg-white/5 px-4 py-3 rounded-lg">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span class="text-white text-sm">{{ getDocumentTypeLabel(doc.type) }}</span>
                </div>
                <span class="text-purple-300 text-xs">{{ formatDate(doc.uploadedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div *ngIf="!isLoading && hasProfileChanges" class="mt-6 flex justify-end gap-3">
        <button
          (click)="resetProfileChanges()"
          class="px-6 py-3 bg-gray-500/30 text-white rounded-xl hover:bg-gray-500/40 transition-all"
          [disabled]="isSaving"
        >
          إلغاء
        </button>
        <button
          (click)="saveProfile()"
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
export class ProfileComponent implements OnInit {
  // initialize a safe default to avoid template/ngModel errors when API data is missing
  doctor: any = {
    specialtyArabic: '',
    experience: 0,
    bio: '',
    consultationFee: 0,
    languages: [] as string[],
    consultationTypes: [] as string[],
    isVerified: false,
    verificationDocuments: [] as Array<{ type?: string; uploadedAt?: string }>,
    availableTimes: [] as any[]
  };
  originalDoctor: any = JSON.parse(JSON.stringify(this.doctor));
  isLoading = true;
  isSaving = false;
  isUploading = false;
  hasProfileChanges = false;
  errorMessage = '';
  successMessage = '';
  selectedFiles: File[] = [];

  availableLanguages = [
    { value: 'arabic' as const, label: 'العربية' },
    { value: 'english' as const, label: 'English' }
  ];

  consultationTypesList = [
    { value: 'chat' as const, label: 'محادثة نصية' },
    { value: 'video' as const, label: 'فيديو' },
    { value: 'audio' as const, label: 'صوت' }
  ];

  constructor(private doctorService: DoctorService) { }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.doctorService.getMyProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Protect against unexpected shapes; merge into our safe default
          const incoming = response.data.doctor || response.data;
          this.doctor = { ...this.doctor, ...(incoming || {}) };
          this.originalDoctor = JSON.parse(JSON.stringify(this.doctor));
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'حدث خطأ في تحميل البيانات';
        this.isLoading = false;
      }
    });
  }

  onProfileChange(): void {
    this.hasProfileChanges = true;
    this.successMessage = '';
  }

  toggleLanguage(lang: 'arabic' | 'english'): void {
    if (!this.doctor) return;

    if (!this.doctor.languages) {
      this.doctor.languages = [];
    }

    const index = this.doctor.languages.indexOf(lang);
    if (index > -1) {
      this.doctor.languages.splice(index, 1);
    } else {
      this.doctor.languages.push(lang);
    }
    this.onProfileChange();
  }

  toggleConsultationType(type: 'chat' | 'video' | 'audio'): void {
    if (!this.doctor) return;
    if (!this.doctor.consultationTypes) this.doctor.consultationTypes = [];

    const index = this.doctor.consultationTypes.indexOf(type);
    if (index > -1) {
      this.doctor.consultationTypes.splice(index, 1);
    } else {
      this.doctor.consultationTypes.push(type);
    }
    this.onProfileChange();
  }

  resetProfileChanges(): void {
    this.doctor = JSON.parse(JSON.stringify(this.originalDoctor || this.doctor));
    this.hasProfileChanges = false;
    this.successMessage = '';
  }

  saveProfile(): void {
    if (!this.doctor) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      specialtyArabic: this.doctor.specialtyArabic,
      experience: this.doctor.experience,
      bio: this.doctor.bio,
      consultationFee: this.doctor.consultationFee,
      languages: this.doctor.languages,
      consultationTypes: this.doctor.consultationTypes
    };

    this.doctorService.updateProfile(updateData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'تم حفظ البيانات بنجاح';
          this.hasProfileChanges = false;
          this.originalDoctor = JSON.parse(JSON.stringify(this.doctor));

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

  onFileSelect(event: any): void {
    const files = Array.from(event?.target?.files || []) as File[];

    // Validate max 5 files
    if (this.selectedFiles.length + files.length > 5) {
      this.errorMessage = 'يمكنك رفع 5 ملفات كحد أقصى';
      return;
    }

    this.selectedFiles.push(...files);
    this.errorMessage = '';
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  uploadDocuments(): void {
    if (this.selectedFiles.length === 0) return;

    this.isUploading = true;
    this.errorMessage = '';

    const formData = new FormData();
    this.selectedFiles.forEach(file => {
      formData.append('verificationDocuments', file);
    });

    this.doctorService.uploadVerificationDocuments(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'تم رفع المستندات بنجاح';
          this.selectedFiles = [];
          this.loadProfile(); // Reload to show new documents
        }
        this.isUploading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'حدث خطأ في رفع المستندات';
        this.isUploading = false;
      }
    });
  }

  getDocumentTypeLabel(type: string): string {
    const types: Record<string, string> = {
      'license': 'رخصة مزاولة المهنة',
      'certificate': 'شهادة',
      'id': 'بطاقة الهوية'
    };
    return types[type] || type;
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date as any);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
