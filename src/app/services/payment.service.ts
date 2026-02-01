import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymobPaymentRequest {
  // Empty - Backend handles everything
  // No amountCents, no billingData
  // Prevents client-side price manipulation
}

export interface PaymobPaymentResponse {
  success: boolean;
  data: {
    iframeUrl: string;
    orderId: string;
  };
  message?: string;
}

export interface PaymentStatusResponse {
  orderId: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  method: string;
  transactionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // ✅ الـ API URL الصح - بدون /api/v1 لأنه موجود في environment
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) { }

  /**
   * Process cash payment - Backend handles all calculations
   */
  cashPayment(): Observable<any> {
    return this.http.post(`${this.apiUrl}/cash`, {});
  }

  /**
   * Process wallet payment - Backend handles all calculations
   */
  processPayment(orderId: string, method: 'wallet'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${method}`, {
      orderId
    });
  }

  /**
   * Create Paymob payment token and get iframe URL
   */
  createPaymobPayment(request: PaymobPaymentRequest): Observable<PaymobPaymentResponse> {
    return this.http.post<PaymobPaymentResponse>(
      `${this.apiUrl}/paymob/create-token`,
      request
    );
  }

  /**
   * Get payment status for an order
   */
  getPaymentStatus(orderId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(
      `${environment.apiUrl}/payments/status/${orderId}`
    );
  }

  /**
   * Process wallet payment
   */
  processWalletPayment(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/wallet`, {
      orderId
    });
  }

  /**
   * Create Stripe payment intent
   */
  createStripePaymentIntent(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/stripe/create-intent`, {
      orderId
    });
  }

  /**
   * Confirm Stripe payment
   */
  confirmStripePayment(paymentIntentId: string, orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/stripe/confirm`, {
      paymentIntentId,
      orderId
    });
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods(): Observable<any> {
    return this.http.get(`${this.apiUrl}/methods`);
  }

  /**
   * Get payment history
   */
  getPaymentHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/history`);
  }
}
