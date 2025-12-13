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
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component'; // ✅ Add this
import { ConsultComponent } from './components/consult/consult.component';
import { DoctorsComponent } from './components/doctors/doctors.component';
import { HeroSectionComponent } from './components/herosection/herosection.component';
import { HomeComponent } from './components/home/home.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { PharmacyComponent } from './components/pharmacy/pharmacy.component';
import { FooterComponent } from './components/footer/footer.component';
import { DashboardLayoutComponent } from './components/layout/dashboard-layout/dashboard-layout.component';
import { DoctorDashboardComponent } from './components/doctor-dashboard/doctor-dashboard.component';
import { AvailabilityComponent } from './components/doctor-dashboard/availability/availability.component';
import { DashboardMainComponent } from './components/doctor-dashboard/dashboard-main/dashboard-main.component';
import { MyConsultationsComponent } from './components/doctor-dashboard/my-consultations/my-consultations.component';
import { ProfileComponent } from './components/doctor-dashboard/profile/profile.component';
import { SettingsComponent } from './components/doctor-dashboard/settings/settings.component';
import { StatsCardsComponent } from './components/doctor-dashboard/stats-cards/stats-cards.component';
import { UpcomingConsultationsComponent } from './components/doctor-dashboard/upcoming-consultations/upcoming-consultations.component';

// Services
import { AuthService } from './services/auth.service';
import { PharmacistService } from './services/pharmacist.service';
import { DoctorService } from './services/doctor.service';
import { DashboardService } from './services/dashboard.service';
import { UserService } from './services/user.service';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { PharmacistGuard } from './guards/pharmacist.guard';
import { CustomerGuard } from './guards/customer.guard';
import { DoctorGuard } from './guards/doctor.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    PharmacistDashboardComponent,
    UserDashboardComponent, // ✅ Add this
    ConsultComponent,
    DoctorsComponent,
    HeroSectionComponent,
    HomeComponent,
    NavbarComponent,
    PharmacyComponent,
    FooterComponent
    ,
    DoctorDashboardComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    DashboardLayoutComponent,
    AvailabilityComponent,
    DashboardMainComponent,
    MyConsultationsComponent,
    ProfileComponent,
    SettingsComponent,
    StatsCardsComponent,
    UpcomingConsultationsComponent,
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
