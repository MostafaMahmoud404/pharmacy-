import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="min-h-screen bg-gray-50 text-gray-900">
      <app-header (toggleSidebar)="isSidebarOpen = !isSidebarOpen"></app-header>

      <div class="flex">
        <app-sidebar [isOpen]="isSidebarOpen" (isOpenChange)="isSidebarOpen = $event"></app-sidebar>

        <main class="flex-1 p-8">
          <div class="container mx-auto">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `
})
export class DashboardLayoutComponent {
  isSidebarOpen = true;
}
