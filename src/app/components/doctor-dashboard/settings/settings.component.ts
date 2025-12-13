import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Account Settings -->
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          إعدادات الحساب
        </h2>

        <!-- Loading State -->
        <div *ngIf="isLoadingProfile" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-300"></div>
        </div>

        <!-- Profile Update Form -->
        <div *ngIf="!isLoadingProfile && currentUser" class="space-y-4">
          <div class="grid md:grid-cols-2 gap-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-purple-200 mb-2">الاسم</label>
              <input
                type="text"
                [(ngModel)]="profileData.name"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="الاسم الكامل"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-purple-200 mb-2">رقم الهاتف</label>
              <input
                type="tel"
                [(ngModel)]="profileData.phone"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="01XXXXXXXXX"
                pattern="[0-9]{11}"
              />
            </div>
          </div>

          <!-- Email (Read-only) -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              [value]="currentUser.email"
              readonly
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
            />
            <p class="text-xs text-purple-300 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
          </div>

          <!-- Update Profile Button -->
          <div class="flex justify-end">
            <button
              (click)="updateProfile()"
              [disabled]="isUpdatingProfile"
              class="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50"
            >
              {{ isUpdatingProfile ? 'جارٍ الحفظ...' : 'حفظ التغييرات' }}
            </button>
          </div>

          <!-- Success/Error Messages -->
          <div *ngIf="profileSuccessMessage" class="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
            <p class="text-green-300">{{ profileSuccessMessage }}</p>
          </div>
          <div *ngIf="profileErrorMessage" class="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p class="text-red-300">{{ profileErrorMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Change Password -->
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          تغيير كلمة المرور
        </h2>

        <form (ngSubmit)="changePassword()" class="space-y-4">
          <!-- Current Password -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">كلمة المرور الحالية</label>
            <div class="relative">
              <input
                [type]="showCurrentPassword ? 'text' : 'password'"
                [(ngModel)]="passwordData.currentPassword"
                name="currentPassword"
                required
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="showCurrentPassword = !showCurrentPassword"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"
              >
                <svg *ngIf="!showCurrentPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg *ngIf="showCurrentPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">كلمة المرور الجديدة</label>
            <div class="relative">
              <input
                [type]="showNewPassword ? 'text' : 'password'"
                [(ngModel)]="passwordData.newPassword"
                name="newPassword"
                required
                minlength="6"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="showNewPassword = !showNewPassword"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"
              >
                <svg *ngIf="!showNewPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg *ngIf="showNewPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-purple-300 mt-1">يجب أن تكون 6 أحرف على الأقل</p>
          </div>

          <!-- Confirm New Password -->
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">تأكيد كلمة المرور الجديدة</label>
            <div class="relative">
              <input
                [type]="showConfirmPassword ? 'text' : 'password'"
                [(ngModel)]="passwordData.confirmPassword"
                name="confirmPassword"
                required
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="showConfirmPassword = !showConfirmPassword"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"
              >
                <svg *ngIf="!showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg *ngIf="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Change Password Button -->
          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="isChangingPassword || !isPasswordValid()"
              class="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50"
            >
              {{ isChangingPassword ? 'جارٍ التغيير...' : 'تغيير كلمة المرور' }}
            </button>
          </div>

          <!-- Success/Error Messages -->
          <div *ngIf="passwordSuccessMessage" class="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
            <p class="text-green-300">{{ passwordSuccessMessage }}</p>
          </div>
          <div *ngIf="passwordErrorMessage" class="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p class="text-red-300">{{ passwordErrorMessage }}</p>
          </div>
        </form>
      </div>

      <!-- Danger Zone -->
      <div class="bg-red-500/10 backdrop-blur-lg rounded-2xl border border-red-500/30 p-6">
        <h2 class="text-2xl font-bold text-red-300 mb-4 flex items-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          منطقة الخطر
        </h2>
        <p class="text-red-200 mb-4">هذه الإجراءات لا يمكن التراجع عنها. يرجى التأكد قبل المتابعة.</p>

        <div class="space-y-3">
          <!-- Logout Button -->
          <button
            (click)="logout()"
            class="w-full md:w-auto px-6 py-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all border border-red-500/50"
          >
            تسجيل الخروج من الحساب
          </button>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  currentUser: User | null = null;

  // Profile Update
  profileData = {
    name: '',
    phone: ''
  };
  isLoadingProfile = true;
  isUpdatingProfile = false;
  profileSuccessMessage = '';
  profileErrorMessage = '';

  // Password Change
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isChangingPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  passwordSuccessMessage = '';
  passwordErrorMessage = '';

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.currentUser = this.authService.currentUserValue;

    if (this.currentUser) {
      this.profileData.name = this.currentUser?.name || '';
      this.profileData.phone = this.currentUser?.phone || '';
      this.isLoadingProfile = false;
    } else {
      // Fetch from API if not in memory
      this.authService.getMe().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // `getMe` may return { user, token } or user directly depending on API; normalize
            const user: any = (response.data && (response.data as any).user) ? (response.data as any).user : response.data;
            this.currentUser = user as any;
            this.profileData.name = this.currentUser?.name || '';
            this.profileData.phone = this.currentUser?.phone || '';
          }
          this.isLoadingProfile = false;
        },
        error: () => {
          this.isLoadingProfile = false;
        }
      });
    }
  }

  updateProfile(): void {
    this.isUpdatingProfile = true;
    this.profileErrorMessage = '';
    this.profileSuccessMessage = '';

    this.userService.updateProfile(this.profileData).subscribe({
      next: (response) => {
        if (response.success) {
          this.profileSuccessMessage = 'تم تحديث البيانات بنجاح';

          // Update current user
          if (this.currentUser) {
            this.currentUser.name = this.profileData.name;
            this.currentUser.phone = this.profileData.phone;
          }

          setTimeout(() => {
            this.profileSuccessMessage = '';
          }, 3000);
        }
        this.isUpdatingProfile = false;
      },
      error: (error) => {
        this.profileErrorMessage = error.error?.message || 'حدث خطأ في تحديث البيانات';
        this.isUpdatingProfile = false;
      }
    });
  }

  isPasswordValid(): boolean {
    return (
      this.passwordData.currentPassword.length >= 6 &&
      this.passwordData.newPassword.length >= 6 &&
      this.passwordData.newPassword === this.passwordData.confirmPassword
    );
  }

  changePassword(): void {
    if (!this.isPasswordValid()) {
      this.passwordErrorMessage = 'يرجى التأكد من صحة البيانات';
      return;
    }

    this.isChangingPassword = true;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    this.userService.updatePassword({
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.passwordSuccessMessage = 'تم تغيير كلمة المرور بنجاح';

          // Reset form
          this.passwordData = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };

          setTimeout(() => {
            this.passwordSuccessMessage = '';
          }, 3000);
        }
        this.isChangingPassword = false;
      },
      error: (error) => {
        this.passwordErrorMessage = error.error?.message || 'حدث خطأ في تغيير كلمة المرور';
        this.isChangingPassword = false;
      }
    });
  }

  logout(): void {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      this.authService.logout();
    }
  }
}
