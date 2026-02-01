import { Injectable } from '@angular/core';
import { interval, Subject } from 'rxjs';
import { switchMap, takeUntil, timeout, tap } from 'rxjs/operators';
import { PaymentService, PaymentStatusResponse } from './payment.service';

export interface PollingConfig {
  orderId: string;
  maxRetries?: number;
  pollInterval?: number; // in milliseconds
  maxTimeout?: number; // in milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class PaymentPollingService {
  private destroy$ = new Subject<void>();

  // Default config
  private defaultConfig: PollingConfig = {
    orderId: '',
    maxRetries: 30, // 30 attempts
    pollInterval: 2000, // 2 seconds
    maxTimeout: 60000 // 60 seconds
  };

  constructor(private paymentService: PaymentService) { }

  /**
   * Start polling for payment status
   * Emits payment status updates until payment is confirmed or timeout
   */
  startPolling(config: Partial<PollingConfig> = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };

    return interval(finalConfig.pollInterval!).pipe(
      switchMap(() =>
        this.paymentService.getPaymentStatus(finalConfig.orderId!).pipe(
          timeout(finalConfig.maxTimeout!)
        )
      ),
      takeUntil(this.destroy$),
      tap((response: PaymentStatusResponse) => {
        // Stop polling if payment is confirmed or failed
        if (response.paymentStatus === 'paid' || response.paymentStatus === 'failed') {
          this.stopPolling();
        }
      })
    );
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
  }

  /**
   * Reset polling for new session
   */
  reset(): void {
    this.stopPolling();
  }
}
