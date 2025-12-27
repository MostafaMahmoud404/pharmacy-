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

  constructor(private http: HttpClient) {
    console.log('Product Service - API URL:', this.apiUrl);
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
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get product by ID
   */
  getProductById(id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/${id}`)
      .pipe(
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
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Delete product image
   */
  deleteProductImage(productId: string, imageId: string): Observable<ProductResponse> {
    return this.http.delete<ProductResponse>(`${this.apiUrl}/${productId}/images/${imageId}`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Set main image
   */
  setMainImage(productId: string, imageId: string): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.apiUrl}/${productId}/images/${imageId}/main`, {})
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Update product stock
   */
  updateStock(id: string, quantity: number, operation: 'add' | 'subtract'): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.apiUrl}/${id}/stock`, { quantity, operation })
      .pipe(
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
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get featured products
   */
  getFeaturedProducts(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/featured`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get best selling products
   */
  getBestSellingProducts(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/best-selling`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Get low stock products
   */
  getLowStockProducts(): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/low-stock`)
      .pipe(
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
}
