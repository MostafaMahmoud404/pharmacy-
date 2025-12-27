// src/app/services/cart.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { CartService, CartItem } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CartService]
    });
    service = TestBed.inject(CartService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addToCart', () => {
    it('should add new item to cart', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        requiresPrescription: false
      };

      const result = service.addToCart(product);
      expect(result.success).toBeTruthy();
      expect(result.message).toContain('تم إضافة المنتج');

      const items = service.getCartItems();
      expect(items.length).toBe(1);
      expect(items[0]._id).toBe('1');
      expect(items[0].quantity).toBe(1);
    });

    it('should increase quantity for existing item', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        requiresPrescription: false
      };

      service.addToCart(product);
      service.addToCart(product);

      const items = service.getCartItems();
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(2);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        requiresPrescription: false
      };

      service.addToCart(product);
      const result = service.updateQuantity('1', 5);

      expect(result.success).toBeTruthy();
      const items = service.getCartItems();
      expect(items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is 0', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        requiresPrescription: false
      };

      service.addToCart(product);
      const result = service.updateQuantity('1', 0);

      expect(result.success).toBeTruthy();
      const items = service.getCartItems();
      expect(items.length).toBe(0);
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        requiresPrescription: false
      };

      service.addToCart(product);
      const result = service.removeFromCart('1');

      expect(result.success).toBeTruthy();
      const items = service.getCartItems();
      expect(items.length).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items', () => {
      const product1 = {
        _id: '1',
        name: 'Product 1',
        nameArabic: 'منتج 1',
        price: 100,
        requiresPrescription: false
      };

      const product2 = {
        _id: '2',
        name: 'Product 2',
        nameArabic: 'منتج 2',
        price: 200,
        requiresPrescription: false
      };

      service.addToCart(product1);
      service.addToCart(product2);

      service.clearCart();

      const items = service.getCartItems();
      expect(items.length).toBe(0);
    });
  });

  describe('getCartSummary', () => {
    it('should calculate summary correctly', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        discountPrice: 80,
        requiresPrescription: false
      };

      service.addToCart(product, 2);

      const summary = service.getCartSummary();
      expect(summary.subtotal).toBe(160); // 80 * 2
      expect(summary.tax).toBe(22.4); // 160 * 0.14
      expect(summary.totalItems).toBe(2);
    });
  });

  describe('persistence', () => {
    it('should persist cart in localStorage', () => {
      const product = {
        _id: '1',
        name: 'Test Product',
        nameArabic: 'منتج تجريبي',
        price: 100,
        requiresPrescription: false
      };

      service.addToCart(product);

      // Create new service instance to test loading from storage
      const newService = new CartService();
      const items = newService.getCartItems();
      expect(items.length).toBe(1);
    });
  });
});
