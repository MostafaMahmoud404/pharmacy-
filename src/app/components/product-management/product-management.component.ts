// src/app/components/product-management/product-management.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService, Product } from '../../services/products.service';

interface ProductFilters {
  search: string;
  category: string;
  status: string;
  stock: string;
}

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedProducts: Set<string> = new Set();
  isLoading = true;
  viewMode: 'grid' | 'list' = 'grid';
  showFilters = false;
  isDeleting = false;

  filters: ProductFilters = {
    search: '',
    category: '',
    status: 'all',
    stock: 'all'
  };

  pagination = {
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  };

  stats = {
    total: 0,
    active: 0,
    inactive: 0,
    lowStock: 0,
    outOfStock: 0
  };

  categories = [
    { en: 'Medications', ar: 'أدوية' },
    { en: 'Vitamins & Supplements', ar: 'فيتامينات ومكملات' },
    { en: 'Personal Care', ar: 'العناية الشخصية' },
    { en: 'Medical Equipment', ar: 'معدات طبية' },
    { en: 'Baby & Mother Care', ar: 'رعاية الطفل والأم' },
    { en: 'Skin Care', ar: 'العناية بالبشرة' },
    { en: 'Herbal & Natural', ar: 'أعشاب وطبيعي' }
  ];

  private destroy$ = new Subject<void>();
  Math = Math;

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.isLoading = true;
    const params = {
      page: this.pagination.page,
      limit: this.pagination.limit
    };

    this.productService.getProducts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.products = response.data.products || [];
          this.filteredProducts = this.products;
          if (response.pagination) {
            this.pagination = response.pagination;
          }
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Load Products Error:', error);
          this.showErrorMessage('فشل تحميل المنتجات: ' + error.message);
          this.isLoading = false;
        }
      });
  }

  loadStats(): void {
    this.productService.getProductStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.data?.stats) {
            this.stats = {
              total: response.data.stats.total || 0,
              active: response.data.stats.active || 0,
              inactive: response.data.stats.total - response.data.stats.active || 0,
              lowStock: response.data.stats.lowStock || 0,
              outOfStock: response.data.stats.outOfStock || 0
            };
          }
        },
        error: (error: any) => console.error('Stats Error:', error)
      });
  }

  applyFilters(): void {
    let filtered = [...this.products];

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.nameArabic?.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
      );
    }

    if (this.filters.category) {
      filtered = filtered.filter(p => p.category === this.filters.category);
    }

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(p =>
        this.filters.status === 'active' ? p.isActive : !p.isActive
      );
    }

    if (this.filters.stock !== 'all') {
      if (this.filters.stock === 'low') {
        filtered = filtered.filter(p => p.stock > 0 && p.stock <= 10);
      } else if (this.filters.stock === 'out') {
        filtered = filtered.filter(p => p.stock === 0);
      }
    }

    this.filteredProducts = filtered;
  }

  onSearch(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      category: '',
      status: 'all',
      stock: 'all'
    };
    this.applyFilters();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleSelectProduct(productId: string | undefined): void {
    if (!productId) return;
    if (this.selectedProducts.has(productId)) {
      this.selectedProducts.delete(productId);
    } else {
      this.selectedProducts.add(productId);
    }
  }

  selectAll(): void {
    if (this.selectedProducts.size === this.filteredProducts.length) {
      this.selectedProducts.clear();
    } else {
      this.filteredProducts.forEach(p => {
        if (p._id) this.selectedProducts.add(p._id);
      });
    }
  }

  // ✅ دالة التوجيه لإضافة منتج جديد
  navigateToAddProduct(): void {
    this.router.navigate(['/pharmacist-dashboard/products/add']);
  }

  editProduct(productId: string | undefined): void {
    if (productId) {
      this.router.navigate(['/pharmacist-dashboard/products/edit', productId]);
    }
  }

  viewProduct(productId: string | undefined): void {
    if (productId) {
      this.router.navigate(['/pharmacist-dashboard/products', productId]);
    }
  }

  deleteProduct(product: Product): void {
    if (!product._id) {
      this.showErrorMessage('معرف المنتج غير صحيح');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) return;

    this.isDeleting = true;

    this.productService.deleteProduct(product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccessMessage(`تم حذف "${product.name}" بنجاح`);
          this.selectedProducts.delete(product._id!);
          this.loadProducts();
          this.loadStats();
          this.isDeleting = false;
        },
        error: (error: any) => {
          console.error('Delete error:', error);
          this.showErrorMessage(`فشل حذف المنتج: ${error.message}`);
          this.isDeleting = false;
        }
      });
  }

  deleteSelected(): void {
    if (this.selectedProducts.size === 0) {
      this.showErrorMessage('الرجاء تحديد منتجات للحذف');
      return;
    }

    if (!confirm(`سيتم حذف ${this.selectedProducts.size} منتج. هل تريد المتابعة؟`)) return;

    this.isDeleting = true;
    const selectedIds = Array.from(this.selectedProducts);
    let deletedCount = 0;
    let errorCount = 0;

    selectedIds.forEach((id) => {
      this.productService.deleteProduct(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            deletedCount++;
            this.checkDeletionComplete(selectedIds.length, deletedCount, errorCount);
          },
          error: () => {
            errorCount++;
            this.checkDeletionComplete(selectedIds.length, deletedCount, errorCount);
          }
        });
    });
  }

  private checkDeletionComplete(total: number, deleted: number, errors: number): void {
    if (deleted + errors === total) {
      this.isDeleting = false;
      this.selectedProducts.clear();

      if (errors > 0) {
        this.showErrorMessage(`تم حذف ${deleted} منتج، فشل حذف ${errors} منتج`);
      } else {
        this.showSuccessMessage(`تم حذف ${deleted} منتج بنجاح`);
      }

      this.loadProducts();
      this.loadStats();
    }
  }

  toggleProductStatus(product: Product): void {
    if (!product._id) return;

    const formData = new FormData();
    formData.append('isActive', (!product.isActive).toString());

    this.productService.updateProduct(product._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          product.isActive = !product.isActive;
          this.showSuccessMessage('تم تحديث حالة المنتج');
          this.loadStats();
        },
        error: (error: any) => {
          this.showErrorMessage('فشل تحديث الحالة: ' + error.message);
        }
      });
  }

  updateStock(product: Product): void {
    const quantity = prompt('أدخل الكمية الجديدة:', product.stock.toString());
    if (!quantity || !product._id) return;

    const newStock = parseInt(quantity);
    if (isNaN(newStock) || newStock < 0) {
      this.showErrorMessage('الرجاء إدخال رقم صحيح');
      return;
    }

    const operation = newStock > product.stock ? 'add' : 'subtract';
    const diff = Math.abs(newStock - product.stock);

    this.productService.updateStock(product._id, diff, operation)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          product.stock = newStock;
          this.showSuccessMessage('تم تحديث المخزون');
          this.loadStats();
        },
        error: (error: any) => {
          this.showErrorMessage('فشل تحديث المخزون: ' + error.message);
        }
      });
  }

  previousPage(): void {
    if (this.pagination.page > 1) {
      this.pagination.page--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.pagination.page < this.pagination.pages) {
      this.pagination.page++;
      this.loadProducts();
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  getStockStatusClass(stock: number): string {
    if (stock === 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
  }

  getStockStatusText(stock: number): string {
    if (stock === 0) return 'نفذ من المخزون';
    if (stock <= 10) return 'مخزون منخفض';
    return 'متوفر';
  }

  private showSuccessMessage(message: string): void {
    alert(message);
  }

  private showErrorMessage(message: string): void {
    alert(message);
  }
}
