// src/app/app-routing.module.ts (Fixed)

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { PharmacistDashboardComponent } from './components/pharmacist-dashboard/pharmacist-dashboard.component';
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { DoctorsComponent } from './components/doctors/doctors.component';
import { PharmacyComponent } from './components/pharmacy/pharmacy.component';
import { DoctorDashboardComponent } from './components/doctor-dashboard/doctor-dashboard.component';
import { ProductManagementComponent } from './components/product-management/product-management.component';
import { ProductsPageComponent } from './components/products-page/products-page.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { PharmacistGuard } from './guards/pharmacist.guard';
import { CustomerGuard } from './guards/customer.guard';
import { DoctorGuard } from './guards/doctor.guard';
import { AboutComponent } from './components/about/about.component';
import { ConsultationComponent } from './components/consultation/consultation.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';

const routes: Routes = [
  // Public routes
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'doctors', component: DoctorsComponent },
  { path: 'pharmacy', component: PharmacyComponent },
  {
    path: 'consultations',
    component: ConsultationComponent,
    canActivate: [AuthGuard],
    data: { roles: ['customer', 'doctor', 'admin'] }
  },
  {
    path: 'products',
    component: ProductsPageComponent  // صفحة عرض للعملاء
  },
  {
    path: 'cart',
    component: CartComponent
  },
  {
    path: 'checkout',
    component: CheckoutComponent
  },

  // Auth routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Protected routes - Doctor Dashboard
  {
    path: 'doctor-dashboard',
    component: DoctorDashboardComponent,
    canActivate: [AuthGuard, DoctorGuard],
    data: { roles: ['doctor', 'admin'] }
  },

  // Protected routes - Pharmacist Dashboard (Main)
  {
    path: 'pharmacist-dashboard',
    component: PharmacistDashboardComponent,
    canActivate: [AuthGuard, PharmacistGuard],
    data: { roles: ['pharmacist', 'admin'] }
  },

  // ✅ Product Management Routes (للصيدلي)
  // 1️⃣ صفحة إدارة المنتجات (القائمة الرئيسية)
  {
    path: 'pharmacist-dashboard/products',
    component: ProductManagementComponent,
    canActivate: [AuthGuard, PharmacistGuard],
    data: { roles: ['pharmacist', 'admin'] }
  },

  // 2️⃣ فورم إضافة منتج جديد
  {
    path: 'pharmacist-dashboard/products/add',
    component: ProductFormComponent,
    canActivate: [AuthGuard, PharmacistGuard],
    data: { roles: ['pharmacist', 'admin'] }
  },

  // 3️⃣ فورم تعديل منتج موجود
  {
    path: 'pharmacist-dashboard/products/edit/:id',
    component: ProductFormComponent,
    canActivate: [AuthGuard, PharmacistGuard],
    data: { roles: ['pharmacist', 'admin'] }
  },

  // Protected routes - User Dashboard (Customer/Patient)
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [AuthGuard, CustomerGuard],
    data: { roles: ['customer', 'patient'] }
  },

  // Protected routes - Admin Dashboard
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },

  // Catch-all route
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
