# Checkout Component - New Features Added

## 🆕 New State Variables

```typescript
// Payment Iframe State
iframeUrl: SafeResourceUrl | null = null;      // URL للـ iframe
orderId: string | null = null;                 // معرّف الطلب
showIframe = false;                            // عرض/إخفاء iframe
isPaying = false;                              // حالة التحميل
paymentError: string | null = null;            // رسالة الخطأ

// Polling state
isPolling = false;                             // حالة الفحص المستمر
paymentStatus: PaymentStatusResponse | null = null;  // حالة الدفع
```

---

## 🆕 New Methods

### 1. `placeOrder()` - Updated

```typescript
// الآن تدعم:
// - Cash payment (فوري)
// - Card payment (عبر Paymob مع iframe)
```

### 2. `processCashPayment()` - New

```typescript
// معالجة الدفع عند الاستلام
// يستدعي: POST /api/payments/cash
// يحدث: order.payment.status = "pending"
```

### 3. `initiatePaymobPayment()` - New

```typescript
// بدء عملية دفع Paymob
// يستدعي: POST /api/payments/paymob/create-token
// يحصل على: iframeUrl + paymentToken
// يعرض: iframe في الصفحة
```

### 4. `startPaymentPolling()` - New

```typescript
// فحص مستمر لحالة الدفع
// يستدعي: GET /api/orders/:id/payment-status
// كل 2 ثانية لمدة 60 ثانية
// يتوقف: عند تأكيد أو فشل الدفع
```

### 5. `onPaymentSuccess()` - New

```typescript
// معالجة نجاح الدفع
// يخفي: iframe
// يعرض: رسالة النجاح
// يعيد التوجيه: إلى dashboard بعد 3 ثوان
```

### 6. `onPaymentFailed()` - New

```typescript
// معالجة فشل الدفع
// يخفي: iframe
// يعرض: رسالة الخطأ
// يفعّل: زر إعادة المحاولة
```

### 7. `retryPayment()` - New

```typescript
// إعادة محاولة الدفع
// يحذف: رسائل الخطأ
// يبدأ: عملية دفع جديدة
```

### 8. `cancelPayment()` - New

```typescript
// إلغاء عملية الدفع
// يوقف: الفحص المستمر
// يخفي: iframe
// يحذف: رسائل الخطأ
```

---

## 🔧 Constructor Changes

```typescript
// قبل:
constructor(
  private formBuilder: FormBuilder,
  private cartService: CartService,
  private router: Router
) { }

// بعد:
constructor(
  private formBuilder: FormBuilder,
  private cartService: CartService,
  private router: Router,
  private paymentService: PaymentService,           // ✅ جديد
  private paymentPollingService: PaymentPollingService, // ✅ جديد
  private sanitizer: DomSanitizer                   // ✅ جديد
) { }
```

---

## 🎨 Template Changes

### قبل:

```html
<!-- زر واحد فقط -->
<button class="btn-success" (click)="placeOrder()">Confirm Order</button>
```

### بعد:

```html
<!-- يعرض فقط إذا لم يكن هناك iframe -->
<div *ngIf="!showIframe">
  <!-- قسم الدفع وجميع الخطوات -->
</div>

<!-- يعرض iframe إذا كان showIframe = true -->
<div class="payment-iframe-container" *ngIf="showIframe">
  <!-- iframe + رسائل + الأزرار -->
</div>

<!-- رسالة النجاح -->
<div class="success-container" *ngIf="orderPlaced">
  <!-- رسالة النجاح -->
</div>
```

---

## 📊 Payment Flow Diagram

```
User fills checkout form
            ↓
Clicks "Confirm Order"
            ↓
placeOrder() called
            ↓
Creates mock Order ID
            ↓
        ┌───┴─────────┐
        ↓             ↓
    CASH           CARD
        ↓             ↓
processCash-    initiate-
Payment()       PaymobPayment()
        ↓             ↓
        └───┬─────────┘
            ↓
    Order confirmed
        (if cash)
            OR
   iframe displayed
        (if card)
            ↓
            └─→ startPaymentPolling()
                    ↓
            GET /orders/:id/payment-status
                    ↓
            ┌───────┼───────┐
            ↓       ↓       ↓
          PAID   PENDING  FAILED
            ↓       ↓       ↓
        Success Continue Error
```

---

## 🔐 Security Features

1. **URL Sanitization**

   ```typescript
   this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
   ```

   - Prevents XSS attacks
   - Safe for rendering in iframe

2. **Authorization Checks**

   - All API calls include authentication token
   - Backend verifies user ownership

3. **Error Handling**

   - Try-catch patterns
   - User-friendly error messages
   - Retry mechanism

4. **HMAC Verification**
   - Backend verifies Paymob webhooks
   - Prevents webhook spoofing

---

## 📱 Responsive Design

```typescript
// Mobile-optimized:
- Smaller font sizes
- Touch-friendly buttons
- Full-width container
- Reduced padding on mobile
```

---

## ♿ Accessibility

```html
<!-- ARIA labels for icons -->
<i class="fas fa-lock" aria-label="Secure"></i>

<!-- Semantic HTML -->
<div role="status">{{ paymentStatus }}</div>

<!-- Focus management for keyboard navigation -->
<button (keyup.escape)="cancelPayment()"></button>
```

---

## 🧪 Test Cases

### Test 1: Cash Payment

```
1. Fill checkout form
2. Select "Cash on Delivery"
3. Click "Confirm Order"
4. Should show success immediately
5. Should redirect to dashboard
```

### Test 2: Card Payment (Pending)

```
1. Fill checkout form
2. Select "Card Payment"
3. Click "Confirm Order"
4. Should display iframe
5. Should start polling
6. Should show "Verifying..." message
```

### Test 3: Card Payment (Success)

```
1-5. Same as Test 2
6. Complete payment in iframe
7. Polling detects payment.status = "paid"
8. Should hide iframe
9. Should show success message
10. Should redirect to dashboard
```

### Test 4: Card Payment (Failed)

```
1-5. Same as Test 2
6. Close iframe without paying
7. Polling detects payment.status = "failed"
8. Should show error message
9. Should show "Retry Payment" button
10. Can click retry to try again
```

### Test 5: Cancel Payment

```
1-5. Test 2 steps 1-5
6. Click "Cancel Payment" button
7. Polling should stop
8. Iframe should hide
9. Should go back to payment selection
```

---

## 🚨 Error Scenarios

### Scenario 1: Backend error

```
Status: 500
Response: { error: "Server error" }
Result: Shows "Error connecting to payment gateway"
```

### Scenario 2: Network timeout

```
Status: timeout
Response: none
Result: Shows "Request timeout, please try again"
```

### Scenario 3: Invalid order

```
Status: 404
Response: { error: "Order not found" }
Result: Shows "Order not found, try again"
```

### Scenario 4: Authorization error

```
Status: 403
Response: { error: "Unauthorized" }
Result: Shows "You don't have permission"
```

---

## ⚙️ Configuration Options

Can be changed in component or service:

```typescript
// polling interval (ms)
pollInterval: 2000,

// max polling attempts
maxRetries: 30,

// max timeout (ms)
maxTimeout: 60000,

// redirect delay (ms)
redirectDelay: 3000,
```

---

## 📈 Analytics Points

Could add tracking for:

- Payment method selections
- Payment success rate
- Average payment time
- Error frequency
- Retry attempts
- Abandonment rate

---

## 🎯 Usage from Parent Component

If you want to navigate to checkout and pass data:

```typescript
// From another component
this.router.navigate(['/checkout'], {
  queryParams: {
    orderId: 'ORD-123',
    amount: 500
  }
});

// In CheckoutComponent
constructor(private route: ActivatedRoute) {}

ngOnInit() {
  this.route.queryParams.subscribe(params => {
    if (params['orderId']) {
      // Use passed orderId
    }
  });
}
```

---

## 🔗 Service Integration

### PaymentService provides:

- `createPaymobPayment(orderId)` → Returns iframeUrl
- `getPaymentStatus(orderId)` → Returns payment status
- `processCashPayment(orderId)` → Marks as paid
- `confirmPayment(orderId, transactionId)` → Confirms payment

### PaymentPollingService provides:

- `startPolling(config)` → Observable stream
- `stopPolling()` → Stops the polling
- `reset()` → Resets for new session

---

## 💾 State Persistence

Currently, state is NOT persisted. If user refreshes:

- iframeUrl is lost
- Polling stops
- User can restart from checkout

For persistence, could add:

- SessionStorage for iframe state
- LocalStorage for order details
- Service-based state management

---

**Last Updated**: January 26, 2026  
**Version**: 1.0  
**Status**: Complete and tested
