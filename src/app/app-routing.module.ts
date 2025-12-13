// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { PharmacistDashboardComponent } from './components/pharmacist-dashboard/pharmacist-dashboard.component';
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component'; // ✅ Add this
import { HomeComponent } from './components/home/home.component';
import { DoctorsComponent } from './components/doctors/doctors.component';
import { PharmacyComponent } from './components/pharmacy/pharmacy.component';
import { DoctorDashboardComponent } from './components/doctor-dashboard/doctor-dashboard.component';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { PharmacistGuard } from './guards/pharmacist.guard';
import { CustomerGuard } from './guards/customer.guard';
import { DoctorGuard } from './guards/doctor.guard';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'doctors', component: DoctorsComponent },
  { path: 'pharmacy', component: PharmacyComponent },

  // Auth routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Protected routes - Pharmacist Dashboard
  {
    path: 'pharmacist-dashboard',
    component: PharmacistDashboardComponent,
    canActivate: [AuthGuard, PharmacistGuard],
    data: { roles: ['pharmacist', 'admin'] }
  },

  // ✅ Protected routes - User Dashboard (NEW)
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [AuthGuard, CustomerGuard],
    data: { roles: ['customer', 'patient'] }
  },

  // ✅ NEW: Protected routes - Doctor Dashboard
  {
    path: 'doctor-dashboard',
    component: DoctorDashboardComponent,
    canActivate: [AuthGuard, DoctorGuard],
    data: { roles: ['doctor', 'admin'] }
  },

  // Catch-all
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
