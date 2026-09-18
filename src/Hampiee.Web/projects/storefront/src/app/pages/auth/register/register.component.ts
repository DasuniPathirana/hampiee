import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md">

        <div class="text-center mb-8">
          <a routerLink="/">
            <h1 class="font-display text-4xl font-bold text-navy-900">Hampiee</h1>
            <p class="text-gold-500 text-sm font-medium">Premium Sri Lankan Gifting</p>
          </a>
        </div>

        <div class="bg-white rounded-2xl shadow-card p-8">
          <h2 class="font-display text-2xl font-bold text-navy-900 mb-1">Create your account</h2>
          <p class="text-gray-400 text-sm mb-6">Join thousands of happy gift givers 🎁</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">First Name *</label>
                <input formControlName="firstName" type="text" class="form-input" placeholder="Ayesha"/>
              </div>
              <div>
                <label class="form-label">Last Name *</label>
                <input formControlName="lastName" type="text" class="form-input" placeholder="Fernando"/>
              </div>
            </div>

            <div>
              <label class="form-label">Email address *</label>
              <input formControlName="email" type="email" class="form-input" placeholder="you@example.com"/>
            </div>

            <div>
              <label class="form-label">Phone (optional)</label>
              <input formControlName="phone" type="tel" class="form-input" placeholder="077 123 4567"/>
            </div>

            <div>
              <label class="form-label">Password *</label>
              <div class="relative">
                <input formControlName="password" [type]="showPwd() ? 'text' : 'password'"
                       class="form-input pr-12" placeholder="Min. 8 characters"/>
                <button type="button" (click)="showPwd.update(v => !v)"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-700">
                  {{ showPwd() ? '🙈' : '👁️' }}
                </button>
              </div>
              <!-- Password strength -->
              @if ((form.get('password')?.value || '').length > 0) {
                <div class="mt-1.5 flex gap-1">
                  @for (bar of [1,2,3,4]; track bar) {
                    <div class="flex-1 h-1 rounded-full transition-colors"
                         [class.bg-red-400]="passwordStrength() === 1 && bar <= 1"
                         [class.bg-yellow-400]="passwordStrength() === 2 && bar <= 2"
                         [class.bg-blue-400]="passwordStrength() === 3 && bar <= 3"
                         [class.bg-ceylon-400]="passwordStrength() === 4"
                         [class.bg-gray-100]="bar > passwordStrength()"></div>
                  }
                </div>
              }
            </div>

            @if (error()) {
              <div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {{ error() }}
              </div>
            }

            <button type="submit" [disabled]="loading() || !form.valid"
                    class="btn-primary w-full py-4 text-base font-semibold rounded-xl disabled:opacity-50">
              @if (loading()) { Creating account... } @else { Create Account }
            </button>

            <p class="text-xs text-gray-400 text-center">
              By creating an account you agree to our
              <a routerLink="/terms" class="text-gold-600 hover:underline">Terms of Service</a> and
              <a routerLink="/privacy" class="text-gold-600 hover:underline">Privacy Policy</a>.
            </p>
          </form>

          <p class="text-center text-sm text-gray-500 mt-6">
            Already have an account?
            <a routerLink="/login" class="text-gold-600 font-semibold hover:underline ml-1">Sign in →</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    phone:     [''],
    password:  ['', [Validators.required, Validators.minLength(8)]]
  });

  loading = signal(false);
  error = signal('');
  showPwd = signal(false);

  passwordStrength = (): number => {
    const pwd = this.form.get('password')?.value ?? '';
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  };

  onSubmit() {
    if (!this.form.valid) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        const errors = err.error?.errors as string[];
        this.error.set(errors?.join(', ') ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
