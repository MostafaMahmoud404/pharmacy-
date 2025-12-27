// src/app/components/products-page/products-page.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService, Product } from '../../services/products.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-products-page',
  templateUrl: './products-page.component.html',
  styleUrls: ['./products-page.component.css']
})
export class ProductsPageComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = false;
  searchTerm = '';
  selectedCategory = '';
  priceRange = { min: 0, max: 1000 };
  requiresPrescriptionFilter = false;
  pagination: any = null;
  Math = Math; // ✅ Add Math for template
  sidebarOpen = false; // ✅ Add sidebar state

  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private cartService: CartService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(page: number = 1): void {
    this.isLoading = true;

    if (this.searchTerm) {
      // ✅ Fixed: searchProducts takes only query string
      const searchParams = {
        q: this.searchTerm,
        category: this.selectedCategory || undefined,
        minPrice: this.priceRange.min,
        maxPrice: this.priceRange.max,
        requiresPrescription: this.requiresPrescriptionFilter
      };

      this.productService.searchProducts(searchParams)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.products = response.data.products;
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Search error:', error);
            this.isLoading = false;
          }
        });
    } else if (this.selectedCategory) {
      const filters = { page, category: this.selectedCategory };
      this.productService.getProductsByCategory(this.selectedCategory, filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.products = response.data.products;
            this.pagination = response.pagination;
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Category error:', error);
            this.isLoading = false;
          }
        });
    } else {
      const filters = { page };
      this.productService.getProducts(filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.products = response.data.products;
            this.pagination = response.pagination;
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Load error:', error);
            this.isLoading = false;
          }
        });
    }
  }

  onSearch(): void {
    this.loadProducts(1);
  }

  onCategoryChange(): void {
    this.loadProducts(1);
  }

  onPriceChange(): void {
    this.loadProducts(1);
  }

  onFilterChange(): void {
    this.loadProducts(1);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.priceRange = { min: 0, max: 1000 };
    this.requiresPrescriptionFilter = false;
    this.loadProducts(1);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  previousPage(): void {
    if (this.pagination?.page > 1) {
      this.loadProducts(this.pagination.page - 1);
    }
  }

  nextPage(): void {
    if (this.pagination?.page < this.pagination?.pages) {
      this.loadProducts(this.pagination.page + 1);
    }
  }

  viewProduct(productId: string | undefined): void {
    if (productId) {
      console.log('View product:', productId);
      // TODO: Navigate to product details
    }
  }

  addToCart(event: Event, product: Product): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn) {
      alert('يرجى تسجيل الدخول أولاً');
      return;
    }

    const result = this.cartService.addToCart(product);
    alert(result.message);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}
