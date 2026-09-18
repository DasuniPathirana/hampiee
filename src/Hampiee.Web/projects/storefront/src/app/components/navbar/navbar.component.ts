import { Component, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Top bar announcement -->
    @if (announcement()) {
      <div class="bg-navy-900 text-white text-center py-2 text-xs font-medium">
        🚚 Free delivery on orders over LKR 10,000 · Island-Wide Delivery Available
        <button (click)="announcement.set(false)" class="ml-4 opacity-60 hover:opacity-100">✕</button>
      </div>
    }

    <!-- Main Navbar -->
    <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-shadow"
         [class.shadow-md]="scrolled()">
      <div class="container-hampiee h-16 md:h-18 flex items-center justify-between gap-4">

        <!-- Logo -->
        <a routerLink="/" class="flex items-center gap-2 flex-shrink-0">
          <span class="font-display text-2xl md:text-3xl font-bold text-navy-900 tracking-tight">
            Hampiee
          </span>
          <span class="hidden md:inline text-gold-500 text-xs font-medium uppercase tracking-widest border border-gold-300 px-2 py-0.5 rounded-full">
            SL
          </span>
        </a>

        <!-- Desktop nav links -->
        <div class="hidden md:flex items-center gap-1">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path"
               routerLinkActive="text-gold-600 font-semibold"
               class="px-4 py-2 rounded-full text-sm font-medium text-navy-700 hover:bg-gold-50 hover:text-gold-700 transition-colors">
              {{ link.label }}
            </a>
          }
        </div>

        <!-- Right actions -->
        <div class="flex items-center gap-2">

          <!-- Search toggle (desktop) -->
          <button class="hidden md:flex btn-icon text-navy-700" (click)="toggleSearch()">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>

          <!-- Auth -->
          @if (auth.isAuthenticated()) {
            <a routerLink="/account" class="hidden md:flex btn-ghost !px-4 !py-2 text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <span>{{ auth.user()?.fullName?.split(' ')[0] }}</span>
            </a>
          } @else {
            <a routerLink="/login" class="hidden md:flex btn-ghost !px-4 !py-2 text-sm">Sign In</a>
          }

          <!-- Cart -->
          <button class="relative p-2 text-navy-700 hover:text-gold-600 transition-colors" (click)="cart.openCart()">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            @if (cart.itemCount() > 0) {
              <span class="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center
                           rounded-full bg-gold-500 text-white text-[10px] font-bold px-1 animate-fade-in">
                {{ cart.itemCount() }}
              </span>
            }
          </button>

          <!-- Mobile menu toggle -->
          <button class="md:hidden p-2 text-navy-700" (click)="mobileOpen.update(v => !v)">
            @if (mobileOpen()) {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            } @else {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            }
          </button>
        </div>
      </div>

      <!-- Search bar (slides down) -->
      @if (searchOpen()) {
        <div class="border-t border-gray-100 bg-white px-4 py-3 animate-slide-up">
          <div class="container-hampiee">
            <div class="relative">
              <input [(ngModel)]="searchQuery" (keydown.enter)="doSearch()"
                     type="search" placeholder="Search hampers, products, occasions..."
                     class="form-input pr-12"
                     autofocus/>
              <button (click)="doSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gold-500 hover:text-gold-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Mobile menu -->
      @if (mobileOpen()) {
        <div class="md:hidden border-t border-gray-100 bg-white animate-slide-up">
          <div class="px-4 py-4 space-y-1">
            @for (link of navLinks; track link.path) {
              <a [routerLink]="link.path" (click)="mobileOpen.set(false)"
                 class="block px-4 py-3 rounded-xl text-navy-700 hover:bg-gold-50 hover:text-gold-700 font-medium">
                {{ link.label }}
              </a>
            }
            <hr class="my-3 border-gray-100"/>
            @if (auth.isAuthenticated()) {
              <a routerLink="/account" (click)="mobileOpen.set(false)"
                 class="block px-4 py-3 rounded-xl text-navy-700 hover:bg-gold-50">My Account</a>
              <button (click)="auth.logout()" class="w-full text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50">Sign Out</button>
            } @else {
              <a routerLink="/login" (click)="mobileOpen.set(false)"
                 class="block px-4 py-3 rounded-xl bg-navy-900 text-white text-center font-semibold">Sign In</a>
              <a routerLink="/register" (click)="mobileOpen.set(false)"
                 class="block px-4 py-3 rounded-xl border border-navy-900 text-center font-semibold">Create Account</a>
            }
          </div>
        </div>
      }
    </nav>
  `,
  styles: [`:host { display: block; }`]
})
export class NavbarComponent {
  cart = inject(CartService);
  auth = inject(AuthService);
  private router = inject(Router);

  announcement = signal(true);
  scrolled = signal(false);
  mobileOpen = signal(false);
  searchOpen = signal(false);
  searchQuery = '';

  navLinks = [
    { label: 'Hampers', path: '/collections' },
    { label: 'Build Yours', path: '/builder' },
    { label: 'Occasions', path: '/collections?tab=occasions' },
    { label: 'Corporate', path: '/collections/corporate' },
    { label: 'Our Story', path: '/about' },
  ];

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  toggleSearch() {
    this.searchOpen.update(v => !v);
    this.mobileOpen.set(false);
  }

  doSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/collections'], { queryParams: { q: this.searchQuery.trim() } });
      this.searchOpen.set(false);
      this.searchQuery = '';
    }
  }
}
