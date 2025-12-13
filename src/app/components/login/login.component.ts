import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl = '';
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // إذا كان المستخدم مسجل دخول بالفعل، عيد توجيهه للصفحة الرئيسية
    if (this.authService.currentUserValue) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    // إنشاء الـ Form
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // الحصول على return url من route parameters أو default لـ '/home'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  // سهولة الوصول للـ form controls
  get f() {
    return this.loginForm.controls;
  }

  // تبديل إظهار/إخفاء كلمة المرور
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // التوقف إذا كان الـ form غير صالح
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;

    this.authService.login(this.loginForm.value)
      .subscribe({
        next: (response) => {
          console.log('✅ Login successful:', response);
          // إعادة التوجيه للصفحة المطلوبة (home افتراضياً)
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          console.error('❌ Login error:', error);
          this.error = error.error?.message || 'حدث خطأ أثناء تسجيل الدخول';
          this.loading = false;
        }
      });
  }

  // الانتقال لصفحة التسجيل (بدون تسجيل خروج)
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  // الانتقال لصفحة نسيت كلمة المرور
  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
