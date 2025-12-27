// src/app/services/consultation.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {
  private apiUrl = `${environment.apiUrl}/consultations`;

  constructor(private http: HttpClient) { }

  // حجز استشارة جديدة
  bookConsultation(consultationData: {
    doctorId: string;
    type: 'chat' | 'video' | 'audio';
    scheduledTime: string;
    chiefComplaint: string;
    symptoms?: Array<{
      name: string;
      duration?: string;
      severity?: 'mild' | 'moderate' | 'severe';
    }>;
    medicalHistory?: {
      chronicDiseases?: string[];
      allergies?: string[];
      currentMedications?: Array<{
        name: string;
        dosage: string;
        frequency: string;
      }>;
      surgeries?: Array<{
        name: string;
        date: Date;
      }>;
      familyHistory?: string[];
    };
  }): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(this.apiUrl, consultationData));
  }

  // الحصول على استشارة محددة
  getConsultationById(id: string): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}`));
  }

  // الحصول على استشارات المريض
  getMyConsultations(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return firstValueFrom(this.http.get<ApiResponse<any>>(`${this.apiUrl}/my`, { params: httpParams }));
  }

  // الحصول على استشارات الطبيب
  getDoctorConsultations(params?: {
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.date) httpParams = httpParams.set('date', params.date);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return firstValueFrom(this.http.get<ApiResponse<any>>(`${this.apiUrl}/doctor/my`, { params: httpParams }));
  }

  // تأكيد الدفع
  confirmPayment(consultationId: string, paymentData: {
    paymentMethod: 'cash' | 'card' | 'wallet' | 'insurance';
    transactionId?: string;
  }): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/confirm-payment`,
      paymentData
    ));
  }

  // بدء الاستشارة
  startConsultation(consultationId: string): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/start`,
      {}
    ));
  }

  // إنهاء الاستشارة
  completeConsultation(consultationId: string, data: {
    doctorNotes?: string;
    diagnosis?: string;
  }): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/complete`,
      data
    ));
  }

  // إلغاء الاستشارة
  cancelConsultation(consultationId: string, reason: string): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/cancel`,
      { reason }
    ));
  }

  // إضافة رسالة في الشات
  addMessage(consultationId: string, messageData: {
    message: string;
    attachments?: Array<{
      type: 'image' | 'document' | 'report';
      url: string;
    }>;
  }): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/messages`,
      messageData
    ));
  }

  // الحصول على رسائل الشات
  getMessages(consultationId: string): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/messages`
    ));
  }

  // تقييم الاستشارة
  rateConsultation(consultationId: string, ratingData: {
    score: number;
    comment?: string;
  }): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${consultationId}/rate`,
      ratingData
    ));
  }

  // الحصول على الاستشارات القادمة
  getUpcomingConsultations(hours: number = 24): Promise<ApiResponse<any>> {
    const params = new HttpParams().set('hours', hours.toString());
    return firstValueFrom(this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/upcoming`,
      { params }
    ));
  }

  // الحصول على إحصائيات الاستشارات
  getConsultationStats(): Promise<ApiResponse<any>> {
    return firstValueFrom(this.http.get<ApiResponse<any>>(`${this.apiUrl}/stats`));
  }

  // الحصول على رابط غرفة الفيديو/الصوت
  getConsultationRoomLink(consultationId: string): string {
    return `${window.location.origin}/consultations/${consultationId}/room`;
  }
}
