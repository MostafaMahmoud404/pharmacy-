// src/app/models/consultation.models.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'doctor' | 'admin' | 'pharmacist';
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  _id: string;
  user: User;
  specialty: string;
  specialtyArabic: string;
  licenseNumber: string;
  yearsOfExperience: number;
  consultationFee: number;
  rating: number;
  totalRatings: number;
  totalConsultations: number;
  isVerified: boolean;
  isAvailable: boolean;
  consultationTypes: Array<'chat' | 'video' | 'audio'>;
  bio?: string;
  bioArabic?: string;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Symptom {
  name: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface Surgery {
  name: string;
  date: Date;
}

export interface MedicalHistory {
  chronicDiseases?: string[];
  allergies?: string[];
  currentMedications?: Medication[];
  surgeries?: Surgery[];
  familyHistory?: string[];
}

export interface VitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
}

export interface ChatMessage {
  _id: string;
  sender: string;
  senderType: 'doctor' | 'patient';
  message: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: Array<{
    type: 'image' | 'document' | 'report';
    url: string;
  }>;
}

export interface VideoCallDetails {
  roomId?: string;
  recordingUrl?: string;
  duration?: number;
}

export interface Payment {
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  method?: 'cash' | 'card' | 'wallet' | 'insurance';
  transactionId?: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
}

export interface Rating {
  score: number;
  comment?: string;
  ratedAt: Date;
}

export interface Consultation {
  _id: string;
  consultationNumber: string;
  doctor: Doctor;
  patient: User;
  type: 'chat' | 'video' | 'audio';
  scheduledTime: string;
  duration: number;
  actualStartTime?: string;
  actualEndTime?: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  cancelledBy?: 'doctor' | 'patient' | 'system';
  cancellationReason?: string;
  cancelledAt?: Date;
  chiefComplaint: string;
  symptoms?: Symptom[];
  medicalHistory?: MedicalHistory;
  vitalSigns?: VitalSigns;
  doctorNotes?: string;
  diagnosis?: string;
  prescription?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpNotes?: string;
  chatMessages: ChatMessage[];
  videoCallDetails?: VideoCallDetails;
  payment: Payment;
  rating?: Rating;
  attachments?: Array<{
    type: 'image' | 'document' | 'report';
    url: string;
    filename?: string;
    uploadedBy?: 'doctor' | 'patient';
    uploadedAt: Date;
  }>;
  reminders?: Array<{
    type: 'sms' | 'email' | 'push';
    sentAt: Date;
    status: 'sent' | 'failed';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationStats {
  consultations: {
    new: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    today: number;
    cancelled: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  upcoming: {
    next24Hours: number;
    thisWeek: number;
  };
  ratings: {
    average: number;
    total: number;
  };
}

export interface BookConsultationRequest {
  doctorId: string;
  type: 'chat' | 'video' | 'audio';
  scheduledTime: string;
  chiefComplaint: string;
  symptoms?: Symptom[];
  medicalHistory?: MedicalHistory;
}

export interface ApiResponse<T> {
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

// Helper Types
export type ConsultationStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
export type ConsultationType = 'chat' | 'video' | 'audio';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'insurance';

// Form Interfaces
export interface ConsultationFilterForm {
  status?: ConsultationStatus;
  type?: ConsultationType;
  dateFrom?: Date;
  dateTo?: Date;
  doctorId?: string;
  patientId?: string;
}

export interface RatingForm {
  score: number;
  comment?: string;
}

export interface PaymentForm {
  paymentMethod: PaymentMethod;
  transactionId?: string;
}

// Utility Functions
export class ConsultationHelper {
  static getStatusColor(status: ConsultationStatus): string {
    const colorMap: Record<ConsultationStatus, string> = {
      'pending': '#f39c12',
      'confirmed': '#3498db',
      'in-progress': '#2980b9',
      'completed': '#27ae60',
      'cancelled': '#e74c3c',
      'no-show': '#c0392b'
    };
    return colorMap[status] || '#7f8c8d';
  }

  static getTypeIcon(type: ConsultationType): string {
    const iconMap: Record<ConsultationType, string> = {
      'chat': '💬',
      'video': '📹',
      'audio': '🎙️'
    };
    return iconMap[type];
  }

  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعة`;
  }

  static canStartConsultation(consultation: Consultation): boolean {
    if (consultation.status !== 'confirmed' || consultation.payment.status !== 'paid') {
      return false;
    }

    const now = new Date();
    const scheduledTime = new Date(consultation.scheduledTime);
    const diffMinutes = (scheduledTime.getTime() - now.getTime()) / 60000;

    return diffMinutes <= 10 && diffMinutes >= -30;
  }

  static canCancelConsultation(consultation: Consultation): boolean {
    return !['completed', 'cancelled'].includes(consultation.status);
  }

  static canRateConsultation(consultation: Consultation): boolean {
    return consultation.status === 'completed' && !consultation.rating;
  }

  static getTimeUntilConsultation(scheduledTime: string): string {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 0) return 'انتهى الموعد';
    if (diffMins < 60) return `بعد ${diffMins} دقيقة`;
    if (diffHours < 24) return `بعد ${diffHours} ساعة`;
    return `بعد ${diffDays} يوم`;
  }
}
