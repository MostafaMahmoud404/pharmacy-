// src/app/components/doctors/doctors.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DoctorService, Doctor, SearchParams } from '../../services/doctor.service';

@Component({
  selector: 'app-doctors',
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  loading = false;
  error = '';

  // Search & Filter
  searchQuery = '';
  selectedSpecialty = '';
  selectedConsultationType = '';
  maxFee: number | null = null;
  minRating: number | null = null;

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalDoctors = 0;
  limit = 12;

  // Lists
  specialties: string[] = [];
  consultationTypes = [
    { value: 'video', label: 'استشارة فيديو' },
    { value: 'audio', label: 'استشارة صوتية' },
    { value: 'chat', label: 'محادثة نصية' },
    { value: 'inPerson', label: 'زيارة شخصية' }
  ];

  // View mode
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private doctorService: DoctorService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.specialties = this.doctorService.getSpecialties();
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.loading = true;
    this.error = '';

    this.doctorService.getDoctors(this.currentPage, this.limit).subscribe({
      next: (response) => {
        if (response.success) {
          this.doctors = response.data.doctors;
          this.filteredDoctors = this.doctors;

          if (response.pagination) {
            this.totalPages = response.pagination.pages;
            this.totalDoctors = response.pagination.total;
          }

          console.log('✅ Doctors loaded:', this.doctors.length);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading doctors:', error);
        this.error = 'حدث خطأ أثناء تحميل الأطباء';
        this.loading = false;
      }
    });
  }

  searchDoctors(): void {
    if (!this.searchQuery && !this.selectedSpecialty &&
      !this.selectedConsultationType && !this.maxFee && !this.minRating) {
      this.loadDoctors();
      return;
    }

    this.loading = true;
    this.error = '';

    const params: SearchParams = {
      q: this.searchQuery || undefined,
      specialty: this.selectedSpecialty || undefined,
      consultationType: this.selectedConsultationType || undefined,
      maxFee: this.maxFee || undefined,
      minRating: this.minRating || undefined,
      page: this.currentPage,
      limit: this.limit
    };

    this.doctorService.searchDoctors(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.filteredDoctors = response.data.doctors;
          console.log('✅ Search results:', this.filteredDoctors.length);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Search error:', error);
        this.error = 'حدث خطأ أثناء البحث';
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedSpecialty = '';
    this.selectedConsultationType = '';
    this.maxFee = null;
    this.minRating = null;
    this.currentPage = 1;
    this.loadDoctors();
  }

  viewDoctorDetails(doctorId: string): void {
    this.router.navigate(['/doctors', doctorId]);
  }

  bookConsultation(doctor: Doctor): void {
    // Navigate to consultation booking page
    this.router.navigate(['/consult'], {
      queryParams: { doctorId: doctor._id }
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadDoctors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  getSpecialtyArabic(specialty: string): string {
    return this.doctorService.getSpecialtyArabic(specialty);
  }

  getConsultationTypeArabic(type: string): string {
    return this.doctorService.getConsultationTypeArabic(type);
  }

  formatCurrency(amount: number): string {
    return this.doctorService.formatCurrency(amount);
  }

  getRatingStars(rating: number): boolean[] {
    return this.doctorService.getRatingStars(rating);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      // Use UI Avatars as fallback (generates image based on doctor name)
      const doctorName = target.alt || 'Doctor';
      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&size=300&background=667eea&color=fff&bold=true`;
    }
  }

  getDefaultImage(doctorName: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&size=300&background=667eea&color=fff&bold=true`;
  }
}
