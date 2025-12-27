// ✅ pharmacy.service.ts
// المسار: src/app/services/pharmacy.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Pharmacy {
  _id: string;
  user: any;
  pharmacyName: string;
  pharmacyNameArabic: string;
  licenseNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    coordinates?: any;
  };
  description: string;
  workingHours: any;
  isAvailable: boolean;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  acceptsInsurance: boolean;
  insuranceProviders: string[];
  pharmacyImage: string;
  stats: any;
  createdAt: string;
}

export interface PharmacyResponse {
  success: boolean;
  message: string;
  data: {
    pharmacies: Pharmacy[];
    pagination: {
      current: number;
      pages: number;
      total: number;
    };
  };
}

export interface PharmacyDetailResponse {
  success: boolean;
  message: string;
  data: {
    pharmacy: Pharmacy;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyService {
  private apiUrl = `${environment.apiUrl}/pharmacies`;

  constructor(private http: HttpClient) {
    console.log('Pharmacy Service - API URL:', this.apiUrl);
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'حدث خطأ في الاتصال بالخادم';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.status) {
      errorMessage = `خطأ ${error.status}: ${error.error?.message || 'فشل الطلب'}`;
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Get all pharmacies with filters and pagination
   */
  getPharmacies(
    page: number = 1,
    limit: number = 10,
    filters?: {
      city?: string;
      state?: string;
      isVerified?: boolean;
      isAvailable?: boolean;
      minRating?: number;
      search?: string;
      sort?: string;
    }
  ): Observable<PharmacyResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.city) params = params.set('city', filters.city);
    if (filters?.state) params = params.set('state', filters.state);
    if (filters?.isVerified !== undefined) params = params.set('isVerified', filters.isVerified.toString());
    if (filters?.isAvailable !== undefined) params = params.set('isAvailable', filters.isAvailable.toString());
    if (filters?.minRating) params = params.set('minRating', filters.minRating.toString());
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.sort) params = params.set('sort', filters.sort);

    console.log('Fetching pharmacies with params:', params);

    return this.http.get<PharmacyResponse>(this.apiUrl, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get single pharmacy by ID
   */
  getPharmacyById(id: string): Observable<PharmacyDetailResponse> {
    console.log('Fetching pharmacy:', id);
    return this.http.get<PharmacyDetailResponse>(`${this.apiUrl}/${id}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get pharmacy products
   */
  getPharmacyProducts(
    pharmacyId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      category?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.minPrice) params = params.set('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());

    return this.http.get<any>(`${this.apiUrl}/${pharmacyId}/products`, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Search pharmacies
   */
  searchPharmacies(query: string, limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get popular pharmacies (verified and high rated)
   */
  getPopularPharmacies(limit: number = 6): Observable<any> {
    const params = new HttpParams()
      .set('isVerified', 'true')
      .set('minRating', '4')
      .set('limit', limit.toString())
      .set('sort', '-rating');

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get nearby pharmacies (filter by city)
   */
  getNearbyPharmacies(city: string, limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('city', city)
      .set('limit', limit.toString())
      .set('isAvailable', 'true');

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
}
