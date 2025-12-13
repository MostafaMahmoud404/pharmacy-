export interface DashboardStats {
  totalPatients?: number;
  todaysAppointments?: number;
  upcomingConsultations?: number;
  completedConsultations?: number;
}

export interface DoctorOverview {
  totalConsultations?: number;
  completedConsultations?: number;
  rating?: { average: number };
}

export interface DoctorTodayStats {
  consultations?: number;
}

export interface DoctorDashboardStats {
  overview: DoctorOverview;
  today: DoctorTodayStats;
  recentConsultations?: any[];
  upcomingConsultations?: any[];
}
