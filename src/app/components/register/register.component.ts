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

interface DoctorFile {
  file: File;
  preview: string;
  name: string;
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
  selectedRole = 'customer';
  passwordStrength: PasswordStrength = {
    score: 0,
    label: '',
    color: '',
    suggestions: [],
    isStrong: false
  };

  // Doctor license file
  doctorLicenseFile: DoctorFile | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.setupPasswordStrengthListener();
    this.setupRoleChangeListener();
  }

  initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordStrengthValidator()]],
      confirmPassword: ['', [Validators.required]],
      role: ['customer'],
      // Doctor-specific fields
      specialty: [''],
      specialtyArabic: [''],
      licenseNumber: [''],
      experience: [null],
      consultationFee: [null]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  setupPasswordStrengthListener(): void {
    this.registerForm.get('password')?.valueChanges.subscribe((password) => {
      this.updatePasswordStrength(password);
    });
  }

  setupRoleChangeListener(): void {
    this.registerForm.get('role')?.valueChanges.subscribe((role) => {
      this.selectedRole = role;
      this.updateDoctorFieldsValidation();
    });
  }

  updateDoctorFieldsValidation(): void {
    const specialtyControl = this.registerForm.get('specialty');
    const specialtyArabicControl = this.registerForm.get('specialtyArabic');
    const licenseNumberControl = this.registerForm.get('licenseNumber');
    const experienceControl = this.registerForm.get('experience');
    const consultationFeeControl = this.registerForm.get('consultationFee');

    if (this.selectedRole === 'doctor') {
      specialtyControl?.setValidators([Validators.required]);
      specialtyArabicControl?.setValidators([Validators.required]);
      licenseNumberControl?.setValidators([Validators.required]);
      experienceControl?.setValidators([Validators.required, Validators.min(0)]);
      consultationFeeControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      specialtyControl?.clearValidators();
      specialtyArabicControl?.clearValidators();
      licenseNumberControl?.clearValidators();
      experienceControl?.clearValidators();
      consultationFeeControl?.clearValidators();
      // Clear license file when switching to customer
      this.doctorLicenseFile = null;
    }

    specialtyControl?.updateValueAndValidity();
    specialtyArabicControl?.updateValueAndValidity();
    licenseNumberControl?.updateValueAndValidity();
    experienceControl?.updateValueAndValidity();
    consultationFeeControl?.updateValueAndValidity();
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

  // File upload handlers
  triggerFileInput(): void {
    const fileInput = document.getElementById('licenseFileInput') as HTMLInputElement;
    fileInput?.click();
  }

  onLicenseFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.error = 'Only PDF, JPG, and PNG files are allowed';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'File size must be less than 5MB';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.doctorLicenseFile = {
          file: file,
          preview: e.target.result,
          name: file.name
        };
        this.error = '';
      };
      reader.readAsDataURL(file);
    }
  }

  removeLicenseFile(): void {
    this.doctorLicenseFile = null;
    const fileInput = document.getElementById('licenseFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (!this.passwordStrength.isStrong) {
      this.error = 'Password is too weak. Please create a stronger password';
      return;
    }

    if (this.registerForm.invalid) {
      return;
    }

    // If doctor, require license file
    if (this.selectedRole === 'doctor' && !this.doctorLicenseFile) {
      this.error = 'License document is required for doctor registration';
      return;
    }

    this.loading = true;
    const { confirmPassword, ...registerData } = this.registerForm.value;

    if (this.selectedRole === 'doctor') {
      this.submitDoctorRegistration(registerData);
    } else {
      this.submitCustomerRegistration(registerData);
    }
  }

  submitDoctorRegistration(registerData: any): void {
    // Create FormData for multipart/form-data (for file upload)
    const formData = new FormData();
    formData.append('name', registerData.name);
    formData.append('email', registerData.email);
    formData.append('password', registerData.password);
    formData.append('phone', registerData.phone);
    formData.append('specialty', registerData.specialty);
    formData.append('specialtyArabic', registerData.specialtyArabic);
    formData.append('licenseNumber', registerData.licenseNumber);
    formData.append('experience', registerData.experience);
    formData.append('consultationFee', registerData.consultationFee);

    // Add license file
    if (this.doctorLicenseFile) {
      formData.append('licenseFile', this.doctorLicenseFile.file, this.doctorLicenseFile.name);
    }

    this.authService.registerDoctor(formData)
      .subscribe({
        next: (response) => {
          console.log('✅ Doctor Registration successful:', response);
          this.success = '✅ Doctor account created successfully! Redirecting...';

          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Doctor Registration error:', error);
          this.loading = false;
          this.handleRegistrationError(error);
        }
      });
  }

  submitCustomerRegistration(registerData: any): void {
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
          this.handleRegistrationError(error);
        }
      });
  }

  handleRegistrationError(error: any): void {
    if (error.error?.errors) {
      Object.keys(error.error.errors).forEach(field => {
        const fieldControl = this.registerForm.get(field);
        const errorMessage = error.error.errors[field];

        if (fieldControl) {
          fieldControl.setErrors({ serverError: errorMessage });
        }
      });
    } else if (error.error?.message) {
      this.error = error.error.message;
    } else {
      this.error = 'Registration failed. Please try again later';
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  formatPhoneNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.startsWith('2')) {
      value = '0' + value.slice(1);
    }

    if (!value.startsWith('0') && value.length > 0) {
      value = '0' + value;
    }

    value = value.slice(0, 11);

    this.registerForm.patchValue({ phone: value }, { emitEvent: false });
  }
}
