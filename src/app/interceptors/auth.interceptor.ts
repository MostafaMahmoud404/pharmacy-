// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // اجمع التعديلات على الطلب بدون تكرار، ولا تضع Content-Type على FormData
    const token = this.authService.getToken();
    let req = request;

    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    // لا نضيف Content-Type إذا كان جسم الطلب من نوع FormData أو إذا تم تحديده بالفعل
    if (!(req.body instanceof FormData) && !req.headers.has('Content-Type')) {
      req = req.clone({ setHeaders: { 'Content-Type': 'application/json' } });
    }

    // إرسال الطلب ومعالجة الأخطاء (مثل 401)
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // إذا كان الـ Token غير صالح، تسجيل خروج
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
