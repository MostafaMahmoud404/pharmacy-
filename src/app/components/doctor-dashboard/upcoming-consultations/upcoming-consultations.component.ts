import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consultation } from '../../../models';

@Component({
  selector: 'app-upcoming-consultations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-consultations.component.html',
  styleUrls: ['./upcoming-consultations.component.css']
})
export class UpcomingConsultationsComponent {
  @Input() consultations: Consultation[] | null = null;
}
