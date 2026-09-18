import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md">

        <!-- Logo -->
        <div class="text-center mb-8">
          <a routerLink="/">
            <h1 class="font-display text-4xl font-bold text-navy-900">Hampiee</h1>
            <p class="text-gold-500 text-sm font-medium">Premium Sri Lankan Gifting</p>
          </a>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-card p-8">
          <h2 class="font-display text-2xl font-bold text-navy-900 mb-1">Welcome back</h2>
          <p class="text-gray-400 text-sm mb-6">Sign in to your Hampiee account</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="form-label">Email address</label>
              <input formControlName="email" type="email" class="form-input"
                     placeholder="you@example.com" autocomplete="email"/>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="form-label !mb-0">Password</label>
                <a routerLink="/forgot-password" class="text-xs text-gold-600 hover:underline">Forgot password?</a>
              </div>
              <div class="relative">
                <input formControlName="password" [type]="showPwd() ? 'text' : 'password'"
                       class="form-input pr-12" placeholder="••••••••" autocomplete="current-password"/>
                <button type="button" (click)="showPwd.update(v => !v)"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-700">
                  {{ showPwd() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {{ error() }}
              </div>
            }

            <button type="submit" [disabled]="loading() || !form.valid"
                    class="btn-primary w-full py-4 text-base font-semibold rounded-xl disabled:opacity-50">
              @if (loading()) { Signing in... } @else { Sign In }
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-3 my-6">
            <div class="flex-1 h-px bg-gray-100"></div>
            <span class="text-xs text-gray-400">OR</span>
            <div class="flex-1 h-px bg-gray-100"></div>
          </div>

          <!-- Register CTA -->
          <p class="text-center text-sm text-gray-500">
            Don't have an account?
            <a routerLink="/register" class="text-gold-600 font-semibold hover:underline ml-1">Create one →</a>
          </p>
        </div>

        <!-- Trust note -->
        <p class="text-center text-xs text-gray-400 mt-6">
          🔒 Your account is secured with industry-standard encryption
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = signal(false);
  error = signal('');
  showPwd = signal(false);

  onSubmit() {
    if (!this.form.valid) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.value.email!, this.form.value.password!).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Invalid email or password. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
