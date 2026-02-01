// src/app/components/cart/cart.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService, CartItem, CartSummary } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  // Properties
  cartItems: CartItem[] = [];
  cartSummary: CartSummary | null = null;
  isLoading = false;

  // Private properties
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCart();
    this.subscribeToCartChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * تحميل محتويات السلة
   */
  private loadCart(): void {
    this.cartItems = this.cartService.getCartItems();
    this.cartSummary = this.cartService.getCartSummary();
  }

  /**
   * الاشتراك في تحديثات السلة
   */
  private subscribeToCartChanges(): void {
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCart();
      });
  }

  /**
   * زيادة كمية منتج
   */
  increaseQuantity(item: CartItem): void {
    const result = this.cartService.updateQuantity(item._id, item.quantity + 1);

    if (!result.success) {
      alert(result.message);
    }
  }

  /**
   * تقليل كمية منتج
   */
  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      this.cartService.updateQuantity(item._id, item.quantity - 1);
    }
  }

  /**
   * تحديث كمية منتج يدوياً
   */
  updateQuantity(item: CartItem, event: any): void {
    const quantity = parseInt(event.target.value, 10);

    if (isNaN(quantity) || quantity < 1) {
      event.target.value = item.quantity;
      return;
    }

    const result = this.cartService.updateQuantity(item._id, quantity);

    if (!result.success) {
      alert(result.message);
      event.target.value = item.quantity;
    }
  }

  /**
   * حذف منتج من السلة
   */
  removeItem(item: CartItem): void {
    const confirmed = confirm(`هل تريد حذف ${item.name} من السلة؟`);

    if (confirmed) {
      this.cartService.removeFromCart(item._id);
    }
  }

  /**
   * مسح السلة بالكامل
   */
  clearCart(): void {
    const confirmed = confirm('هل تريد مسح جميع المنتجات من السلة؟');

    if (confirmed) {
      this.cartService.clearCart();
    }
  }

  /**
   * التحقق من فراغ السلة
   */
  isCartEmpty(): boolean {
    return this.cartItems.length === 0;
  }

  /**
   * الانتقال للدفع
   */
  proceedToCheckout(): void {
    if (this.isCartEmpty()) {
      alert('السلة فارغة!');
      return;
    }

    this.router.navigate(['/checkout']);
  }

  /**
   * الرجوع للتسوق
   */
  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  /**
   * تنسيق السعر
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  /**
   * الحصول على صورة المنتج - FIXED VERSION ✅
   */
  getProductImage(item: CartItem): string {
    // لو مفيش صورة خالص، استخدم placeholder
    if (!item.image) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    }

    // لو الصورة مش فيها http يبقى ضيفله الـ backend URL
    if (!item.image.startsWith('http')) {
      return `http://localhost:5000/${item.image}`;
    }

    return item.image;
  }

  /**
   * معالجة خطأ تحميل الصورة
   */
  onImageError(event: any): void {
    event.target.onerror = null; // منع infinite loop
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }

}
