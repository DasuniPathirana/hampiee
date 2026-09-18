import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

// Simple admin auth interceptor (inline)
import { HttpInterceptorFn } from '@angular/common/http';
const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('hampiee_admin_token');
  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([adminAuthInterceptor])),
    provideAnimationsAsync(),
  ]
};
