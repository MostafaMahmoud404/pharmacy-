import { User } from './user.model';

export interface TimeSlot {
  startTime: string; // e.g. '09:00'
  endTime: string;   // e.g. '10:00'
  isBooked?: boolean;
}

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface AvailableTime {
  day: DayOfWeek;
  slots: TimeSlot[];
}

export interface Qualification {
  title: string;
  institution?: string;
  year?: number;
}

export interface Doctor extends User {
  specialty?: string;
  specialtyArabic?: string;
  qualifications?: Qualification[];
  rating?: number;
  available?: boolean;
  experience?: number;
  bio?: string;
  consultationFee?: number;
  languages?: string[];
  consultationTypes?: string[];
  isVerified?: boolean;
  verificationDocuments?: { type: string; uploadedAt: string }[];
  availableTimes?: AvailableTime[];
}
