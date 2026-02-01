// src/app/components/checkout/checkout.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService, CartSummary } from '../../services/cart.service';
import { PaymentService, PaymobPaymentResponse, PaymentStatusResponse } from '../../services/payment.service';
import { PaymentPollingService } from '../../services/payment-polling.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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

  // Payment Iframe State
  iframeUrl: SafeResourceUrl | null = null;
  rawIframeUrl: string | null = null; // ✅ للـ debugging
  orderId: string | null = null;
  showIframe = false;
  isPaying = false;
  paymentError: string | null = null;

  // Polling state
  isPolling = false;
  paymentStatus: PaymentStatusResponse | null = null;

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
      description: 'Visa, Mastercard'
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
    private router: Router,
    private paymentService: PaymentService,
    private paymentPollingService: PaymentPollingService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadCartSummary();
    this.checkCartEmpty();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.paymentPollingService.stopPolling();
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

    if (!method) return;

    // Allow card and cash payment methods now
    if (method.id === 'card' || method.id === 'cash') {
      this.selectedPaymentMethod = methodId;
    } else {
      // Wallet is still coming soon
      alert('هذه الطريقة ستكون متاحة قريباً! 🚀');
    }
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
   * Place order and initiate payment
   */
  async placeOrder(): Promise<void> {
    if (this.shippingForm.invalid) {
      this.markFormGroupTouched(this.shippingForm);
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    this.isProcessing = true;
    this.paymentError = null;

    // ✅ CRITICAL: Sync cart to backend first!
    try {
      console.log('📦 Syncing cart to backend...');
      await this.syncCartToBackend();
      console.log('✅ Cart synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync cart:', error);
      this.paymentError = 'فشل في مزامنة السلة. حاول مرة أخرى.';
      this.isProcessing = false;
      return;
    }

    // Process payment based on method
    if (this.selectedPaymentMethod === 'cash') {
      this.processPayment('cash');
    } else if (this.selectedPaymentMethod === 'card') {
      this.initiatePaymobPayment();
    }
  }

  /**
   * Sync localStorage cart to backend
   */
  private async syncCartToBackend(): Promise<void> {
    const cartItems = this.cartService.getCartItems();

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    console.log('📤 Syncing cart items:', cartItems);

    return new Promise((resolve, reject) => {
      this.cartService.syncToBackend()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Cart sync response:', response);
            resolve();
          },
          error: (error) => {
            console.error('❌ Cart sync error:', error);
            reject(error);
          }
        });
    });
  }

  /**
   * Process payment (cash on delivery)
   * Backend handles all calculations and order creation
   */
  private processPayment(method: 'cash' | 'wallet'): void {
    this.isPaying = true;
    this.paymentError = null;

    // For cash: Backend handles everything
    if (method === 'cash') {
      this.paymentService.cashPayment()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.orderId = response.orderId;
            this.orderPlaced = true;
            this.cartService.clearCart();

            setTimeout(() => {
              this.router.navigate(['/user-dashboard']);
            }, 3000);
          },
          error: (err) => {
            console.error('Payment error:', err);
            this.paymentError = 'فشل في معالجة الدفع. حاول مرة أخرى.';
            this.isPaying = false;
          }
        });
    } else if (method === 'wallet') {
      // Wallet payment with orderId
      if (!this.orderId) return;

      this.paymentService.processPayment(this.orderId, 'wallet')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.orderPlaced = true;
            this.cartService.clearCart();

            setTimeout(() => {
              this.router.navigate(['/user-dashboard']);
            }, 3000);
          },
          error: (err) => {
            console.error('Payment error:', err);
            this.paymentError = 'فشل في معالجة الدفع. حاول مرة أخرى.';
            this.isPaying = false;
          }
        });
    }
  }

  /**
   * ✅ FIXED: Initiate Paymob payment
   * Backend handles order creation and amount calculation
   */
  private initiatePaymobPayment(): void {
    this.isPaying = true;
    this.paymentError = null;

    console.log('💳 Initiating Paymob payment...');

    // Minimal request - Backend handles everything
    const paymentRequest = {};

    this.paymentService.createPaymobPayment(paymentRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaymobPaymentResponse) => {
          console.log('📨 Paymob response:', response);

          if (response.success && response.data?.iframeUrl) {
            // Backend created order - get orderId from response
            this.orderId = response.data.orderId;

            this.rawIframeUrl = response.data.iframeUrl;
            console.log('🔗 Using backend iframe URL:', this.rawIframeUrl);

            // ✅ CRITICAL FIX: Sanitize iframe URL properly
            this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.data.iframeUrl);

            console.log('✅ Sanitized iframe URL ready');

            this.showIframe = true;
            this.isPaying = false;
            this.isProcessing = false;

            // Start polling for payment status
            console.log('🔄 Starting payment polling...');
            this.startPaymentPolling();
          } else {
            console.error('❌ Invalid response from Paymob:', response);
            this.paymentError = response.message || 'فشل في إنشاء رابط الدفع';
            this.isPaying = false;
            this.isProcessing = false;
          }
        },
        error: (err) => {
          console.error('❌ Paymob API error:', err);
          console.error('Error details:', JSON.stringify(err, null, 2));

          this.paymentError = err.error?.message || 'فشل في إنشاء رابط الدفع. حاول مرة أخرى.';
          this.isPaying = false;
          this.isProcessing = false;
        }
      });
  }

  /**
   * Start polling for payment status
   */
  private startPaymentPolling(): void {
    if (!this.orderId) return;

    this.isPolling = true;

    this.paymentPollingService.startPolling({
      orderId: this.orderId,
      maxRetries: 30,
      pollInterval: 2000, // 2 seconds
      maxTimeout: 60000 // 60 seconds
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaymentStatusResponse) => {
          this.paymentStatus = response;

          if (response.paymentStatus === 'paid') {
            this.onPaymentSuccess();
          } else if (response.paymentStatus === 'failed') {
            this.onPaymentFailed();
          }
        },
        error: (err) => {
          console.error('Polling error:', err);
          this.isPolling = false;
          this.paymentError = 'انتهت مهلة الانتظار. حاول مرة أخرى.';
        }
      });
  }

  /**
   * Handle successful payment
   */
  private onPaymentSuccess(): void {
    this.isPolling = false;
    this.showIframe = false;
    this.orderPlaced = true;
    this.cartService.clearCart();

    setTimeout(() => {
      this.router.navigate(['/user-dashboard']);
    }, 3000);
  }

  /**
   * Handle failed payment
   */
  private onPaymentFailed(): void {
    this.isPolling = false;
    this.showIframe = false;
    this.paymentError = 'فشل الدفع. يرجى محاولة مرة أخرى.';
  }

  /**
   * Retry payment
   */
  retryPayment(): void {
    this.showIframe = false;
    this.paymentError = null;
    this.paymentStatus = null;
    this.initiatePaymobPayment();
  }

  /**
   * Cancel payment
   */
  cancelPayment(): void {
    this.showIframe = false;
    this.paymentError = null;
    this.isPaying = false;
    this.isPolling = false;
    this.paymentStatus = null;
    this.paymentPollingService.stopPolling();
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
