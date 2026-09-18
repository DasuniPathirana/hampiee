import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex h-screen bg-gray-50 font-sans overflow-hidden">

      <!-- Sidebar -->
      <aside class="w-64 bg-navy-900 text-white flex flex-col flex-shrink-0 transition-all duration-300"
             [class.w-16]="collapsed()">

        <!-- Logo -->
        <div class="h-16 flex items-center px-5 border-b border-white/10 flex-shrink-0">
          @if (!collapsed()) {
            <div>
              <h1 class="font-display text-xl font-bold text-white">Hampiee</h1>
              <p class="text-gold-400 text-xs font-medium">Admin Panel</p>
            </div>
          } @else {
            <span class="text-2xl mx-auto">🎁</span>
          }
        </div>

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto py-4 px-2">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-white/10 text-white"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all mb-0.5 group"
               [title]="collapsed() ? item.label : ''">
              <span class="text-lg flex-shrink-0">{{ item.icon }}</span>
              @if (!collapsed()) {
                <span class="text-sm font-medium">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="ml-auto bg-gold-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {{ item.badge }}
                  </span>
                }
              }
            </a>
          }
        </nav>

        <!-- Bottom: collapse toggle + admin info -->
        <div class="border-t border-white/10 p-3">
          @if (!collapsed()) {
            <div class="flex items-center gap-3 mb-3 px-2">
              <div class="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                A
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white font-medium truncate">Admin</p>
                <p class="text-xs text-white/40 truncate">hampiee.com</p>
              </div>
            </div>
          }
          <button (click)="collapsed.update(v => !v)"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-sm transition-all">
            <span>{{ collapsed() ? '▶' : '◀' }}</span>
            @if (!collapsed()) { <span>Collapse</span> }
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Topbar -->
        <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div class="flex items-center gap-3">
            <h2 class="font-semibold text-navy-900 text-lg">{{ currentTitle() }}</h2>
          </div>
          <div class="flex items-center gap-3">
            <!-- View store link -->
            <a href="/" target="_blank"
               class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <span>🌐</span> <span>View Store</span>
            </a>
            <!-- Notifications -->
            <button class="relative p-2 text-gray-400 hover:text-navy-700 rounded-lg hover:bg-gray-100">
              <span class="text-xl">🔔</span>
            </button>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  collapsed = signal(false);

  navItems: NavItem[] = [
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { icon: '📦', label: 'Products', path: '/products' },
    { icon: '🎁', label: 'Hampers', path: '/hampers' },
    { icon: '🛒', label: 'Orders', path: '/orders', badge: 0 },
    { icon: '👥', label: 'Customers', path: '/customers' },
    { icon: '📝', label: 'Content (CMS)', path: '/cms' },
    { icon: '🚚', label: 'Delivery Zones', path: '/delivery-zones' },
    { icon: '🎫', label: 'Promotions', path: '/promotions' },
    { icon: '📈', label: 'Analytics', path: '/analytics' },
  ];

  currentTitle(): string {
    const path = window.location.pathname.split('/').pop() ?? '';
    const item = this.navItems.find(n => n.path.includes(path));
    return item?.label ?? 'Dashboard';
  }
}
