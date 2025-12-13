import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  templateUrl: './herosection.component.html',
  styleUrls: ['./herosection.component.css']
})
export class HeroSectionComponent {
  stats = [
    { value: '500+', label: 'Certified Doctors', color: 'text-blue' },
    { value: '50K+', label: 'Happy Patients', color: 'text-green' },
    { value: '24/7', label: 'Support Available', color: 'text-purple' }
  ];

  trustBadges = [
    { icon: '🔒', label: 'Secure & Private' },
    { icon: '✅', label: 'Certified Doctors' },
    { icon: '⚡', label: 'Instant Access' },
    { icon: '💊', label: 'Quality Meds' }
  ];

  constructor(private router: Router) {}

  onStartConsultation() {
    this.router.navigate(['/doctors']);
  }

  onBuyMedications() {
    this.router.navigate(['/pharmacy']);
  }
}
