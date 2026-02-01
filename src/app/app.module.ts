// src/app/app.module.ts (Fixed - No Duplicates)

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Components
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { PharmacistDashboardComponent } from './components/pharmacist-dashboard/pharmacist-dashboard.component';
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component';
import { ConsultationComponent } from './components/consultation/consultation.component';
import { DoctorsComponent } from './components/doctors/doctors.component';
import { HeroSectionComponent } from './components/herosection/herosection.component';
import { HomeComponent } from './components/home/home.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { PharmacyComponent } from './components/pharmacy/pharmacy.component';
import { DoctorDashboardComponent } from './components/doctor-dashboard/doctor-dashboard.component';
import { FooterComponent } from './components/footer/footer.component';
import { DashboardLayoutComponent } from './components/layout/dashboard-layout/dashboard-layout.component';
import { ProductManagementComponent } from './components/product-management/product-management.component';
import { ProductsPageComponent } from './components/products-page/products-page.component';

// Services
import { AuthService } from './services/auth.service';
import { PharmacistService } from './services/pharmacist.service';
import { DoctorService } from './services/doctor.service';
import { DashboardService } from './services/dashboard.service';
import { UserService } from './services/user.service';
import { ProductService } from './services/products.service';
import { AdminService } from './services/admin.service';
import { ConsultationService } from './services/consultation.service';
import { SocketService } from './services/socket.service'; // ✅ Added

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { PharmacistGuard } from './guards/pharmacist.guard';
import { CustomerGuard } from './guards/customer.guard';
import { DoctorGuard } from './guards/doctor.guard';

// Pipes
import { FilterPipe } from './pipes/filter.pipe';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    PharmacistDashboardComponent,
    UserDashboardComponent,
    ConsultationComponent,
    DoctorsComponent,
    HeroSectionComponent,
    HomeComponent,
    NavbarComponent,
    PharmacyComponent,
    DoctorDashboardComponent,
    FooterComponent,
    ProductManagementComponent,
    ProductsPageComponent,
    FilterPipe,
    ProductFormComponent,
    AdminDashboardComponent,
    AboutComponent,
    CartComponent,
    CheckoutComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    CommonModule
  ],
  providers: [
    AuthService,
    PharmacistService,
    DoctorService,
    DashboardService,
    UserService,
    ProductService,
    AdminService,
    ConsultationService,
    SocketService, // ✅ Added
    AuthGuard,
    PharmacistGuard,
    CustomerGuard,
    DoctorGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
