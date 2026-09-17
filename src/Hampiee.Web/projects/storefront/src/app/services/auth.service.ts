import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  customerId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  customerId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/auth`;

  // ── State ──────────────────────────────────────────────────────────────────
  private _user = signal<AuthUser | null>(this.loadUser());
  user = this._user.asReadonly();
  isAuthenticated = computed(() => !!this._user());
  isAdmin = computed(() => this._user()?.roles?.includes('Admin') || this._user()?.roles?.includes('SuperAdmin'));
  isStaff = computed(() => this._user()?.roles?.some(r => ['Staff', 'Admin', 'SuperAdmin'].includes(r)));

  // ── Actions ────────────────────────────────────────────────────────────────
  login(email: string, password: string) {
    return this.http.post<AuthTokens>(`${this.base}/login`, { email, password }).pipe(
      tap(tokens => this.saveSession(tokens))
    );
  }

  register(data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) {
    return this.http.post<AuthTokens>(`${this.base}/register`, data).pipe(
      tap(tokens => this.saveSession(tokens))
    );
  }

  logout(): void {
    const tokens = this.getStoredTokens();
    if (tokens) {
      this.http.post(`${this.base}/logout`, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }).pipe(catchError(() => of(null))).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/']);
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.base}/forgot-password`, { email });
  }

  resetPassword(email: string, token: string, newPassword: string) {
    return this.http.post(`${this.base}/reset-password`, { email, token, newPassword });
  }

  refreshToken() {
    const tokens = this.getStoredTokens();
    if (!tokens) return of(null);
    return this.http.post<AuthTokens>(`${this.base}/refresh`, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }).pipe(tap(t => this.saveSession(t)));
  }

  getAccessToken(): string | null {
    return this.getStoredTokens()?.accessToken ?? null;
  }

  isTokenExpired(): boolean {
    const tokens = this.getStoredTokens();
    if (!tokens) return true;
    return new Date(tokens.expiresAt) <= new Date();
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private saveSession(tokens: AuthTokens): void {
    localStorage.setItem('hampiee_tokens', JSON.stringify(tokens));
    this._user.set({
      email: tokens.email,
      fullName: tokens.fullName,
      role: tokens.role,
      roles: tokens.roles,
      customerId: tokens.customerId
    });
  }

  private clearSession(): void {
    localStorage.removeItem('hampiee_tokens');
    this._user.set(null);
  }

  private getStoredTokens(): AuthTokens | null {
    try {
      const raw = localStorage.getItem('hampiee_tokens');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private loadUser(): AuthUser | null {
    const tokens = this.getStoredTokens();
    if (!tokens) return null;
    if (new Date(tokens.expiresAt) <= new Date()) return null; // Expired — will refresh via interceptor
    return { email: tokens.email, fullName: tokens.fullName, role: tokens.role, roles: tokens.roles, customerId: tokens.customerId };
  }
}
