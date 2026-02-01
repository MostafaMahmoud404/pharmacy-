// src/app/services/product.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Product {
  _id?: string;
  name: string;
  nameArabic: string;
  description?: string;
  scientificName?: string;
  category: string;
  categoryArabic: string;
  subCategory?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images?: Array<{
    url: string;
    publicId: string;
    isMain: boolean;
  }>;
  manufacturer?: string;
  requiresPrescription: boolean;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  activeIngredients?: string[];
  usageInstructions?: string;
  sideEffects?: string[];
  contraindications?: string[];
  warnings?: string[];
  storageConditions?: string;
  expiryDate?: Date;
  barcode?: string;
  sku: string;
  tags?: string[];
  rating?: number;
  salesCount?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data: {
    product?: Product;
    products?: Product[];
    count?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;
  private backendUrl = 'http://localhost:5000'; // ✅ Base URL للصور

  constructor(private http: HttpClient) {
    console.log('Product Service - API URL:', this.apiUrl);
  }

  // ✅ إضافة: Fix image URLs
  private fixImageUrls(product: Product): Product {
    if (!product) return product;

    // Fix images array
    if (product.images && Array.isArray(product.images)) {
      product.images = product.images.map(img => {
        if (img.url && !img.url.startsWith('http')) {
          return {
            ...img,
            url: `${this.backendUrl}/${img.url}`
          };
        }
        return img;
      });
    }

    // Set placeholder if no images
    if (!product.images || product.images.length === 0) {
      product.images = [{
        url: 'assets/placeholder.svg',
        publicId: '',
        isMain: true
      }];
    }

    return product;
  }

  // ✅ إضافة: Fix multiple products
  private fixProductsUrls(products: Product[]): Product[] {
    return products.map(p => this.fixImageUrls(p));
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'حدث خطأ في الاتصال بالخادم';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.status) {
      errorMessage = error.error?.message || `خطأ ${error.status}: فشل الطلب`;
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Create new product with images
   */
  createProduct(formData: FormData): Observable<ProductResponse> {
    console.log('Creating product at:', this.apiUrl);
    return this.http.post<ProductResponse>(this.apiUrl, formData)
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get all products with filters
   */
  getProducts(filters?: any): Observable<ProductResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ProductResponse>(this.apiUrl, { params })
      .pipe(
        map(response => {
          if (response.data?.products) {
            response.data.products = this.fixProductsUrls(response.data.products);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get product by ID
   */
  getProductById(id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Update product
   */
  updateProduct(id: string, formData: FormData): Observable<ProductResponse> {
    console.log('Updating product:', id);
    return this.http.put<ProductResponse>(`${this.apiUrl}/${id}`, formData)
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Delete product
   */
  deleteProduct(id: string): Observable<ProductResponse> {
    return this.http.delete<ProductResponse>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Upload product images
   */
  uploadProductImages(id: string, formData: FormData): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(`${this.apiUrl}/${id}/images`, formData)
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Delete product image
   */
  deleteProductImage(productId: string, imageId: string): Observable<ProductResponse> {
    return this.http.delete<ProductResponse>(`${this.apiUrl}/${productId}/images/${imageId}`)
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Set main image
   */
  setMainImage(productId: string, imageId: string): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.apiUrl}/${productId}/images/${imageId}/main`, {})
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Update product stock
   */
  updateStock(id: string, quantity: number, operation: 'add' | 'subtract'): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.apiUrl}/${id}/stock`, { quantity, operation })
      .pipe(
        map(response => {
          if (response.data?.product) {
            response.data.product = this.fixImageUrls(response.data.product);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string, filters?: any): Observable<ProductResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ProductResponse>(`${this.apiUrl}/category/${category}`, { params })
      .pipe(
        map(response => {
          if (response.data?.products) {
            response.data.products = this.fixProductsUrls(response.data.products);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Search products
   */
  searchProducts(searchParams: any): Observable<ProductResponse> {
    let params = new HttpParams();

    Object.keys(searchParams).forEach(key => {
      if (searchParams[key] !== null && searchParams[key] !== undefined) {
        params = params.set(key, searchParams[key].toString());
      }
    });

    return this.http.get<ProductResponse>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(response => {
          if (response.data?.products) {
            response.data.products = this.fixProductsUrls(response.data.products);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get featured products
   */
  getFeaturedProducts(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/featured`)
      .pipe(
        map(response => {
          if (response.data?.products) {
            response.data.products = this.fixProductsUrls(response.data.products);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get best selling products
   */
  getBestSellingProducts(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/best-selling`)
      .pipe(
        map(response => {
          if (response.data?.products) {
            response.data.products = this.fixProductsUrls(response.data.products);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get low stock products
   */
  getLowStockProducts(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/low-stock`)
      .pipe(
        map(response => {
          if (response.data?.products) {
            response.data.products = this.fixProductsUrls(response.data.products);
          }
          return response;
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get product statistics
   */
  getProductStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  // ✅ إضافة: Helper method للحصول على الصورة الرئيسية
  getMainImage(product: Product): string {
    if (product.images && product.images.length > 0) {
      const mainImage = product.images.find(img => img.isMain);
      return mainImage ? mainImage.url : product.images[0].url;
    }
    return 'assets/placeholder.svg';
  }
}
