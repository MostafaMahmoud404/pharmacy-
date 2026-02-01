// src/app/services/cart.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface CartItem {
  _id: string;
  name: string;
  nameArabic: string;
  price: number;
  discountPrice?: number;
  image?: string;
  quantity: number;
  requiresPrescription: boolean;
  dosage?: string;
  sku?: string;
  stock?: number;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  totalItems: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_KEY = 'pharmacy_cart';
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCartFromStorage();
  }

  /**
   * Sync local cart to backend
   */
  syncToBackend(): Observable<any> {
    const items = this.getCartItems();
    return this.http.post(`${environment.apiUrl}/cart/sync`, { items });
  }

  /**
   * Get all cart items
   */
  getCartItems(): CartItem[] {
    return [...this.cartSubject.value];
  }

  /**
   * Get cart summary
   */
  getCartSummary(): CartSummary {
    const items = this.getCartItems();
    const subtotal = items.reduce((sum, item) => {
      const price = item.discountPrice || item.price;
      return sum + (price * item.quantity);
    }, 0);
    const tax = Math.round((subtotal * 0.14) * 100) / 100; // Round to 2 decimal places
    const shipping = 0; // Free shipping for now
    const total = subtotal + tax + shipping;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      subtotal,
      tax,
      shipping,
      total,
      totalItems
    };
  }

  /**
   * Add product to cart
   */
  addToCart(product: any, quantity: number = 1): { success: boolean; message: string } {
    const cartItems = this.getCartItems();
    const existingItem = cartItems.find(item => item._id === product._id);

    if (existingItem) {
      return this.updateQuantity(product._id, existingItem.quantity + quantity);
    } else {
      const cartItem: CartItem = {
        _id: product._id,
        name: product.name,
        nameArabic: product.nameArabic,
        price: product.price,
        discountPrice: product.discountPrice,
        image: product.images?.find((img: any) => img.isMain)?.url,
        quantity,
        requiresPrescription: product.requiresPrescription,
        dosage: product.dosageForm,
        sku: product._id, // Using _id as SKU for now
        stock: product.stock
      };

      cartItems.push(cartItem);
      this.saveCart(cartItems);
      return { success: true, message: 'تم إضافة المنتج إلى السلة' };
    }
  }

  /**
   * Update item quantity
   */
  updateQuantity(productId: string, quantity: number): { success: boolean; message: string } {
    const cartItems = this.getCartItems();
    const item = cartItems.find(item => item._id === productId);

    if (!item) {
      return { success: false, message: 'المنتج غير موجود في السلة' };
    }

    if (quantity <= 0) {
      return this.removeFromCart(productId);
    }

    // Check stock limit (assuming we have stock info, but for now just allow)
    item.quantity = quantity;
    this.saveCart(cartItems);
    return { success: true, message: 'تم تحديث الكمية' };
  }

  /**
   * Remove item from cart
   */
  removeFromCart(productId: string): { success: boolean; message: string } {
    const cartItems = this.getCartItems();
    const filteredItems = cartItems.filter(item => item._id !== productId);

    if (filteredItems.length === cartItems.length) {
      return { success: false, message: 'المنتج غير موجود في السلة' };
    }

    this.saveCart(filteredItems);
    return { success: true, message: 'تم حذف المنتج من السلة' };
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this.saveCart([]);
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.getCartItems().length === 0;
  }

  /**
   * Get cart item count
   */
  getItemCount(): number {
    return this.getCartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Load cart from localStorage
   */
  private loadCartFromStorage(): void {
    try {
      const cartData = localStorage.getItem(this.CART_KEY);
      if (cartData) {
        const items = JSON.parse(cartData);
        this.cartSubject.next(items);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.cartSubject.next([]);
    }
  }

  /**
   * Save cart to localStorage
   */
  private saveCart(items: CartItem[]): void {
    try {
      localStorage.setItem(this.CART_KEY, JSON.stringify(items));
      this.cartSubject.next([...items]);
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }
}
