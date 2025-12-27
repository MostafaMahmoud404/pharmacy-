// src/app/components/checkout/checkout.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService, CartSummary } from '../../services/cart.service';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  duration: string;
  icon: string;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  // Forms
  shippingForm!: FormGroup;

  // Data
  cartSummary: CartSummary | null = null;
  selectedPaymentMethod: string = 'cash';
  selectedShippingMethod: string = 'standard';

  // Payment Methods
  paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'الدفع عند الاستلام',
      icon: '💵',
      description: 'ادفع نقداً عند استلام طلبك'
    },
    {
      id: 'card',
      name: 'بطاقة ائتمان',
      icon: '💳',
      description: 'Visa, Mastercard (قريباً)'
    },
    {
      id: 'wallet',
      name: 'محفظة إلكترونية',
      icon: '📱',
      description: 'Vodafone Cash, Fawry (قريباً)'
    }
  ];

  // Shipping Methods
  shippingMethods: ShippingMethod[] = [
    {
      id: 'standard',
      name: 'الشحن العادي',
      price: 50,
      duration: '3-5 أيام عمل',
      icon: '🚚'
    },
    {
      id: 'express',
      name: 'الشحن السريع',
      price: 100,
      duration: '1-2 يوم عمل',
      icon: '⚡'
    },
    {
      id: 'pickup',
      name: 'استلام من الفرع',
      price: 0,
      duration: 'نفس اليوم',
      icon: '🏪'
    }
  ];

  // UI State
  currentStep = 1;
  isProcessing = false;
  orderPlaced = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private cartService: CartService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadCartSummary();
    this.checkCartEmpty();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize shipping form
   */
  private initForm(): void {
    this.shippingForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0-2,5]{1}[0-9]{8}$/)]],
      email: ['', [Validators.email]],
      governorate: ['', Validators.required],
      city: ['', Validators.required],
      address: ['', [Validators.required, Validators.minLength(10)]],
      building: [''],
      floor: [''],
      apartment: [''],
      notes: ['']
    });
  }

  /**
   * Load cart summary
   */
  private loadCartSummary(): void {
    this.cartSummary = this.cartService.getCartSummary();
  }

  /**
   * Check if cart is empty
   */
  private checkCartEmpty(): void {
    if (!this.cartSummary || this.cartSummary.totalItems === 0) {
      alert('السلة فارغة!');
      this.router.navigate(['/cart']);
    }
  }

  /**
   * Select payment method
   */
  selectPaymentMethod(methodId: string): void {
    const method = this.paymentMethods.find(m => m.id === methodId);

    if (method && (method.id === 'card' || method.id === 'wallet')) {
      alert('هذه الطريقة ستكون متاحة قريباً! 🚀');
      return;
    }

    this.selectedPaymentMethod = methodId;
  }

  /**
   * Select shipping method
   */
  selectShippingMethod(methodId: string): void {
    this.selectedShippingMethod = methodId;
    this.loadCartSummary();
  }

  /**
   * Get selected shipping method details
   */
  getSelectedShippingMethod(): ShippingMethod | undefined {
    return this.shippingMethods.find(m => m.id === this.selectedShippingMethod);
  }

  /**
   * Get total with selected shipping
   */
  getTotalWithShipping(): number {
    if (!this.cartSummary) return 0;

    const shippingMethod = this.getSelectedShippingMethod();
    const shippingCost = shippingMethod ? shippingMethod.price : 0;

    return this.cartSummary.subtotal + this.cartSummary.tax + shippingCost;
  }

  /**
   * Go to next step
   */
  nextStep(): void {
    if (this.currentStep === 1 && this.shippingForm.invalid) {
      this.markFormGroupTouched(this.shippingForm);
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  /**
   * Go to previous step
   */
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  /**
   * Place order
   */
  placeOrder(): void {
    if (this.shippingForm.invalid) {
      this.markFormGroupTouched(this.shippingForm);
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    this.isProcessing = true;

    // Simulate API call
    setTimeout(() => {
      const orderData = {
        items: this.cartSummary?.items,
        shipping: this.shippingForm.value,
        paymentMethod: this.selectedPaymentMethod,
        shippingMethod: this.selectedShippingMethod,
        total: this.getTotalWithShipping()
      };

      console.log('Order Data:', orderData);

      // Clear cart
      this.cartService.clearCart();

      // Navigate to success page
      this.isProcessing = false;
      this.orderPlaced = true;

      setTimeout(() => {
        this.router.navigate(['/user-dashboard']);
      }, 3000);
    }, 2000);
  }

  /**
   * Format currency
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2
    }).format(price);
  }

  /**
   * Check if form field has error
   */
  hasError(fieldName: string): boolean {
    const field = this.shippingForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get form field error message
   */
  getErrorMessage(fieldName: string): string {
    const field = this.shippingForm.get(fieldName);

    if (field?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }

    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `يجب أن يحتوي على ${minLength} أحرف على الأقل`;
    }

    if (field?.hasError('pattern')) {
      return 'رقم الهاتف غير صحيح';
    }

    if (field?.hasError('email')) {
      return 'البريد الإلكتروني غير صحيح';
    }

    return '';
  }

  /**
   * Back to cart
   */
  backToCart(): void {
    this.router.navigate(['/cart']);
  }
}
