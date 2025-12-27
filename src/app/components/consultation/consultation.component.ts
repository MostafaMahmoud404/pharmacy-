// consultation.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Doctor {
  _id: string;
  user: {
    _id: string;
    name: string;
    phone?: string;
    profileImage?: string;
  };
  specialty: string;
  specialtyArabic?: string;
  consultationFee: number;
  rating: number;
  totalRatings?: number;
  totalConsultations?: number;
  yearsOfExperience?: number;
  isVerified: boolean;
  isAvailable: boolean;
  consultationTypes?: string[];
}

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.css']
})
export class ConsultationComponent implements OnInit {
  // Data
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];

  // Filters
  selectedSpecialty: string = '';
  selectedType: string = '';
  selectedRating: number = 0;
  maxPrice: number | null = null;
  onlyAvailable: boolean = false;
  onlyVerified: boolean = false;
  searchQuery: string = '';

  // UI State
  isLoading: boolean = false;
  error: string = '';
  sidebarOpen: boolean = false;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 9;
  totalPages: number = 1;

  // Lists for filters
  specialties: string[] = [
    'Internal Medicine',
    'Pediatrics',
    'Dermatology',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Psychiatry',
    'ENT',
    'Ophthalmology',
    'General Practice'
  ];

  // Favorites
  favorites: Set<string> = new Set();

  // API Configuration
  private apiUrl = 'http://localhost:5000/api/v1';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.loadFavorites();
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  loadDoctors(): void {
    this.isLoading = true;
    this.error = '';

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<any>(`${this.apiUrl}/doctors`, { headers }).subscribe({
      next: (response) => {
        this.doctors = response.data?.doctors || response.doctors || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.error = err.error?.message || 'Failed to load doctors. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // ==========================================
  // FILTERS
  // ==========================================

  applyFilters(): void {
    let filtered = [...this.doctors];

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(doctor =>
        doctor.user.name.toLowerCase().includes(query) ||
        doctor.specialty.toLowerCase().includes(query) ||
        doctor.specialtyArabic?.toLowerCase().includes(query)
      );
    }

    // Specialty filter
    if (this.selectedSpecialty) {
      filtered = filtered.filter(doctor =>
        doctor.specialty === this.selectedSpecialty ||
        doctor.specialtyArabic === this.selectedSpecialty
      );
    }

    // Type filter
    if (this.selectedType) {
      filtered = filtered.filter(doctor =>
        doctor.consultationTypes?.includes(this.selectedType)
      );
    }

    // Rating filter
    if (this.selectedRating > 0) {
      filtered = filtered.filter(doctor => doctor.rating >= this.selectedRating);
    }

    // Price filter
    if (this.maxPrice !== null && this.maxPrice > 0) {
      filtered = filtered.filter(doctor => doctor.consultationFee <= this.maxPrice!);
    }

    // Availability filter
    if (this.onlyAvailable) {
      filtered = filtered.filter(doctor => doctor.isAvailable);
    }

    // Verified filter
    if (this.onlyVerified) {
      filtered = filtered.filter(doctor => doctor.isVerified);
    }

    this.filteredDoctors = filtered;
    this.totalPages = Math.ceil(this.filteredDoctors.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  onSearch(value: string): void {
    this.searchQuery = value;
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedSpecialty = '';
    this.selectedType = '';
    this.selectedRating = 0;
    this.maxPrice = null;
    this.onlyAvailable = false;
    this.onlyVerified = false;
    this.searchQuery = '';
    this.applyFilters();
  }

  // ==========================================
  // FAVORITES
  // ==========================================

  loadFavorites(): void {
    const saved = localStorage.getItem('favoriteDoctors');
    if (saved) {
      this.favorites = new Set(JSON.parse(saved));
    }
  }

  saveFavorites(): void {
    localStorage.setItem('favoriteDoctors', JSON.stringify([...this.favorites]));
  }

  toggleFavorite(doctorId: string): void {
    if (this.favorites.has(doctorId)) {
      this.favorites.delete(doctorId);
    } else {
      this.favorites.add(doctorId);
    }
    this.saveFavorites();
  }

  isFavorite(doctorId: string): boolean {
    return this.favorites.has(doctorId);
  }

  // ==========================================
  // PAGINATION
  // ==========================================

  get paginatedDoctors(): Doctor[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredDoctors.slice(start, end);
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ==========================================
  // UI HELPERS
  // ==========================================

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(5).fill(0).map((_, i) => i < fullStars ? 1 : 0);
  }

  getInitials(name?: string): string {
    if (!name) return 'DR';
    const names = name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'video': '📹',
      'audio': '📞',
      'chat': '💬'
    };
    return icons[type] || '💬';
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'video': 'Video',
      'audio': 'Audio',
      'chat': 'Chat'
    };
    return labels[type] || type;
  }

  // ==========================================
  // ACTIONS
  // ==========================================

  bookConsultation(doctorId: string): void {
    // Navigate to booking page with doctor ID
    this.router.navigate(['/book-consultation', doctorId]);
  }

  viewDoctor(doctorId: string): void {
    this.router.navigate(['/doctors', doctorId]);
  }
}
