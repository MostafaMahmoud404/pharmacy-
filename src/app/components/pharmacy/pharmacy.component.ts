// ✅ pharmacy.component.ts - النسخة الصحيحة
// المسار: src/app/components/pharmacy/pharmacy.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// ⚠️ تأكد من وجود هذا الملف
import { PharmacyService, Pharmacy } from '../../services/pharmacy.service';

@Component({
  selector: 'app-pharmacy',
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.css']
})
export class PharmacyComponent implements OnInit, OnDestroy {
  // Data
  pharmacies: Pharmacy[] = [];
  filteredPharmacies: Pharmacy[] = [];
  favorites: Set<string> = new Set();

  // Loading & Error
  isLoading = false;
  error: string = '';

  // Filters
  searchTerm: string = '';
  selectedCity: string = '';
  selectedRating: number = 0;
  onlyAvailable: boolean = false;
  onlyVerified: boolean = false;

  // UI
  sidebarOpen: boolean = true;
  cities: string[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 12;
  totalPages: number = 1;

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private pharmacyService: PharmacyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPharmacies();

    // Setup search debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.searchTerm = searchTerm;
        this.currentPage = 1;
        this.applyFilters();
      });

    // Load favorites from localStorage
    this.loadFavorites();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPharmacies(): void {
    this.isLoading = true;
    this.error = '';

    const filters = {
      city: this.selectedCity || undefined,
      minRating: this.selectedRating || undefined,
      isAvailable: this.onlyAvailable || undefined,
      isVerified: this.onlyVerified || undefined,
      search: this.searchTerm || undefined,
      sort: '-rating'
    };

    this.pharmacyService
      .getPharmacies(this.currentPage, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Pharmacies loaded:', response.data.pharmacies);
          this.pharmacies = response.data.pharmacies;
          this.filteredPharmacies = this.pharmacies;
          this.totalPages = response.data.pagination.pages;

          this.cities = [...new Set(this.pharmacies.map((p: Pharmacy) => p.address.city))];

          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('❌ Error loading pharmacies:', err);
          this.error = err.message || 'Failed to load pharmacies';
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    console.log('Applying filters...');
    this.loadPharmacies();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCity = '';
    this.selectedRating = 0;
    this.onlyAvailable = false;
    this.onlyVerified = false;
    this.currentPage = 1;
    this.loadPharmacies();
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  toggleFavorite(pharmacyId: string): void {
    if (this.favorites.has(pharmacyId)) {
      this.favorites.delete(pharmacyId);
    } else {
      this.favorites.add(pharmacyId);
    }
    this.saveFavorites();
  }

  loadFavorites(): void {
    try {
      const saved = localStorage.getItem('pharmacyFavorites');
      if (saved) {
        this.favorites = new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  saveFavorites(): void {
    try {
      localStorage.setItem('pharmacyFavorites', JSON.stringify(Array.from(this.favorites)));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }

  isFavorite(pharmacyId: string): boolean {
    return this.favorites.has(pharmacyId);
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? 1 : 0);
  }

  viewPharmacy(pharmacyId: string): void {
    this.router.navigate(['/pharmacy', pharmacyId]);
  }

  callPharmacy(phone: string): void {
    window.location.href = `tel:${phone}`;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getPaginationPages(): number[] {
    const pages = [];
    const maxPages = Math.min(5, this.totalPages);
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPharmacies();
      window.scrollTo(0, 0);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPharmacies();
      window.scrollTo(0, 0);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPharmacies();
      window.scrollTo(0, 0);
    }
  }
}
