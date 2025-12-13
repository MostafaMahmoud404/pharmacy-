import { Doctor } from './doctor.model';
import { User } from './user.model';

export interface Consultation {
  _id?: string;
  id?: string | number;
  patient?: User | string;
  doctor?: Doctor | string;
  type?: 'video' | 'audio' | 'chat' | string;
  status?: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | string;
  createdAt?: string; // ISO date
  date?: string; // scheduled date/time
  notes?: string;
}

