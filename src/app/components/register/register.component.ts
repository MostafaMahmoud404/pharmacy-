// src/app/components/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
  isStrong: boolean;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength: PasswordStrength = {
    score: 0,
    label: '',
    color: '',
    suggestions: [],
    isStrong: false
  };

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // لا نعيد توجيه المستخدم المسجل دخول من صفحة التسجيل
    // هذا يسمح للمستخدم بالعودة لتسجيل حساب جديد
  }

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0-2,5]{1}[0-9]{8}$/)]],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator()]],
      confirmPassword: ['', [Validators.required]],
      role: ['customer']
    }, {
      validators: this.passwordMatchValidator
    });

    this.registerForm.get('password')?.valueChanges.subscribe((password) => {
      this.updatePasswordStrength(password);
    });
  }

  passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      const password = control.value;
      if (!password) return null;

      const score = this.calculatePasswordScore(password);

      if (score < 5) {
        return { weakPassword: true };
      }

      return null;
    };
  }

  calculatePasswordScore(password: string): number {
    let score = 0;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const length = password.length;

    if (length >= 6) score += 1;
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (hasUpperCase) score += 1;
    if (hasLowerCase) score += 1;
    if (hasNumeric) score += 1;
    if (hasSpecialChar) score += 1;

    return score;
  }

  updatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = {
        score: 0,
        label: '',
        color: '',
        suggestions: [],
        isStrong: false
      };
      return;
    }

    const score = this.calculatePasswordScore(password);
    const suggestions: string[] = [];

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const length = password.length;

    if (!hasUpperCase) suggestions.push('Add uppercase letters (A-Z)');
    if (!hasLowerCase) suggestions.push('Add lowercase letters (a-z)');
    if (!hasNumeric) suggestions.push('Add numbers (0-9)');
    if (!hasSpecialChar) suggestions.push('Add special characters (!@#$%)');
    if (length < 8) suggestions.push('Make it at least 8 characters long');

    let label = '';
    let color = '';
    let isStrong = false;

    if (score <= 2) {
      label = 'Very Weak';
      color = '#e74c3c';
      isStrong = false;
    } else if (score <= 3) {
      label = 'Weak';
      color = '#e67e22';
      isStrong = false;
    } else if (score <= 4) {
      label = 'Fair';
      color = '#f39c12';
      isStrong = false;
    } else if (score <= 5) {
      label = 'Good';
      color = '#27ae60';
      isStrong = true;
    } else {
      label = 'Strong';
      color = '#1abc9c';
      isStrong = true;
    }

    this.passwordStrength = { score, label, color, suggestions, isStrong };
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  get f() {
    return this.registerForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.registerForm.get('password');
    if (!passwordControl?.errors) return '';

    if (passwordControl.errors['required']) return 'Password is required';
    if (passwordControl.errors['minlength']) return 'Password must be at least 6 characters';
    if (passwordControl.errors['weakPassword']) return 'Password is too weak';

    return '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    // التحقق من قوة كلمة المرور
    if (!this.passwordStrength.isStrong) {
      this.error = 'Password is too weak. Please create a stronger password';
      return;
    }

    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData)
      .subscribe({
        next: (response) => {
          console.log('✅ Registration successful:', response);
          this.success = '✅ Account created successfully! Redirecting...';

          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Registration error:', error);
          this.loading = false;

          // معالجة أخطاء السيرفر
          if (error.error?.errors) {
            // إذا كان الخطأ يحتوي على عدة حقول
            Object.keys(error.error.errors).forEach(field => {
              const fieldControl = this.registerForm.get(field);
              const errorMessage = error.error.errors[field];

              if (fieldControl) {
                fieldControl.setErrors({ serverError: errorMessage });
              }
            });
          } else if (error.error?.message) {
            // خطأ عام واحد
            this.error = error.error.message;
          } else {
            this.error = 'Registration failed. Please try again later';
          }
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  formatPhoneNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // إزالة كل الأحرف غير الأرقام

    // إذا بدأ بـ 2 بدلاً من 0، حوله إلى 0
    if (value.startsWith('2')) {
      value = '0' + value.slice(1);
    }

    // تأكد من أنه يبدأ بـ 0
    if (!value.startsWith('0') && value.length > 0) {
      value = '0' + value;
    }

    // قص إلى 10 أرقام
    value = value.slice(0, 10);

    // تحديث القيمة في الـ form
    this.registerForm.patchValue({ phone: value }, { emitEvent: false });
  }

  // تسجيل خروج وإعادة توجيه لصفحة الـ login
//   goToLogin(): void {
//     // تسجيل خروج المستخدم الحالي
//     this.authService.logout();
//     // إعادة توجيه لصفحة الـ login
//     this.router.navigate(['/login']);
//   }
}

