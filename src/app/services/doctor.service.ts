// src/app/services/doctor.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces
export interface Doctor {
  _id: string;
  user: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  };
  specialty: string;
  specialtyArabic: string;
  licenseNumber: string;
  qualifications: string[];
  experience: number;
  bio?: string;
  consultationFee: number;
  consultationTypes: string[];
  languages: string[];
  rating: {
    average: number;
    count: number;
  };
  totalConsultations: number;
  isVerified: boolean;
  isAvailable: boolean;
  availableTimes?: AvailableTime[];
  createdAt: string;
}

export interface AvailableTime {
  day: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
}

export interface Review {
  _id: string;
  reviewer: {
    name: string;
    profileImage?: string;
  };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface DoctorDetailResponse {
  success: boolean;
  message: string;
  data: {
    doctor: Doctor;
    reviews: Review[];
    ratingDistribution: RatingDistribution;
  };
}

export interface DoctorsResponse {
  success: boolean;
  message: string;
  data: {
    doctors: Doctor[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SearchParams {
  q?: string;
  specialty?: string;
  minRating?: number;
  maxFee?: number;
  consultationType?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {
    console.log('Doctor Service - API URL:', this.apiUrl);
  }

  /**
   * Get all verified and available doctors
   * @param page - Page number
   * @param limit - Items per page
   */
  getDoctors(page: number = 1, limit: number = 12): Observable<DoctorsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<DoctorsResponse>(this.apiUrl, { params })
      .pipe(
        catchError(error => {
          console.error('Error fetching doctors:', error);
          throw error;
        })
      );
  }

  /**
   * Get doctor by ID with reviews
   * @param id - Doctor ID
   */
  getDoctorById(id: string): Observable<DoctorDetailResponse> {
    return this.http.get<DoctorDetailResponse>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching doctor details:', error);
          throw error;
        })
      );
  }

  /**
   * Search doctors with filters
   * @param params - Search parameters
   */
  searchDoctors(params: SearchParams): Observable<DoctorsResponse> {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      const value = params[key as keyof SearchParams];
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<DoctorsResponse>(`${this.apiUrl}/search`, { params: httpParams })
      .pipe(
        catchError(error => {
          console.error('Error searching doctors:', error);
          throw error;
        })
      );
  }

  /**
   * Get doctors by specialty
   * @param specialty - Specialty name
   */
  getDoctorsBySpecialty(specialty: string): Observable<DoctorsResponse> {
    return this.http.get<DoctorsResponse>(`${this.apiUrl}/specialty/${specialty}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching doctors by specialty:', error);
          throw error;
        })
      );
  }

  /**
   * Get all specialties (helper method)
   */
  getSpecialties(): string[] {
    return [
      'cardiology',
      'dermatology',
      'pediatrics',
      'orthopedics',
      'neurology',
      'psychiatry',
      'gynecology',
      'ophthalmology',
      'dentistry',
      'general'
    ];
  }

  /**
   * Get specialty in Arabic
   */
  getSpecialtyArabic(specialty: string): string {
    const specialties: { [key: string]: string } = {
      'cardiology': 'أمراض القلب',
      'dermatology': 'الأمراض الجلدية',
      'pediatrics': 'طب الأطفال',
      'orthopedics': 'العظام',
      'neurology': 'الأعصاب',
      'psychiatry': 'الطب النفسي',
      'gynecology': 'النساء والتوليد',
      'ophthalmology': 'طب العيون',
      'dentistry': 'طب الأسنان',
      'general': 'طب عام'
    };
    return specialties[specialty] || specialty;
  }

  /**
   * Get consultation types in Arabic
   */
  getConsultationTypeArabic(type: string): string {
    const types: { [key: string]: string } = {
      'video': 'استشارة فيديو',
      'audio': 'استشارة صوتية',
      'chat': 'محادثة نصية',
      'inPerson': 'زيارة شخصية'
    };
    return types[type] || type;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return `${amount} جنيه`;
  }

  /**
   * Get rating stars array
   */
  getRatingStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, index) => index < Math.round(rating));
  }

  /**
   * Get doctor's own profile (for logged-in doctor)
   */
  getMyProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`)
      .pipe(
        catchError(error => {
          console.error('Error fetching my profile:', error);
          throw error;
        })
      );
  }

  /**
   * Update doctor profile (for logged-in doctor)
   */
  updateProfile(profileData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, profileData)
      .pipe(
        catchError(error => {
          console.error('Error updating profile:', error);
          throw error;
        })
      );
  }

  /**
   * Update available times (for logged-in doctor)
   */
  updateAvailableTimes(availableTimes: any[]): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/available-times`, { availableTimes })
      .pipe(
        catchError(error => {
          console.error('Error updating available times:', error);
          throw error;
        })
      );
  }

  /**
   * Toggle doctor availability status (for logged-in doctor)
   */
  toggleAvailability(isAvailable: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/availability`, { isAvailable })
      .pipe(
        catchError(error => {
          console.error('Error toggling availability:', error);
          throw error;
        })
      );
  }

  /**
   * Get doctor's own consultations (for logged-in doctor)
   */
  getMyConsultations(params?: any): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/consultations`, { params: httpParams })
      .pipe(
        catchError(error => {
          console.error('Error fetching consultations:', error);
          throw error;
        })
      );
  }

  /**
   * Get upcoming consultations (for logged-in doctor)
   */
  getUpcomingConsultations(hours: number = 24): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consultations/upcoming?hours=${hours}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching upcoming consultations:', error);
          throw error;
        })
      );
  }
}
