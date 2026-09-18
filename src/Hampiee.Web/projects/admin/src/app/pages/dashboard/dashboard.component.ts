import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  totalCustomers: number;
  customersGrowth: number;
  avgOrderValue: number;
  avgGrowth: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: RecentOrder[];
}

interface RecentOrder {
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Page header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p class="text-gray-400 text-sm">Welcome back! Here's what's happening.</p>
        </div>
        <div class="text-sm text-gray-400">{{ today }}</div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        @for (kpi of kpiCards(); track kpi.label) {
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">{{ kpi.icon }}</span>
              <span class="text-xs font-semibold px-2 py-1 rounded-full"
                    [class.text-ceylon-700]="kpi.growth >= 0"
                    [class.bg-ceylon-50]="kpi.growth >= 0"
                    [class.text-red-600]="kpi.growth < 0"
                    [class.bg-red-50]="kpi.growth < 0">
                {{ kpi.growth >= 0 ? '+' : '' }}{{ kpi.growth }}%
              </span>
            </div>
            <p class="text-2xl font-bold text-navy-900 mb-0.5">{{ kpi.value }}</p>
            <p class="text-sm text-gray-400">{{ kpi.label }}</p>
          </div>
        }
      </div>

      <!-- Alerts row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        @if (stats()?.pendingOrders! > 0) {
          <a routerLink="/orders" [queryParams]="{status: 'Pending'}"
             class="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
            <span class="text-2xl">⚡</span>
            <div>
              <p class="font-semibold text-yellow-800">{{ stats()?.pendingOrders }} Pending Orders</p>
              <p class="text-sm text-yellow-600">Awaiting confirmation</p>
            </div>
            <span class="ml-auto text-yellow-400">→</span>
          </a>
        }
        @if (stats()?.lowStockProducts! > 0) {
          <a routerLink="/products" [queryParams]="{filter: 'low-stock'}"
             class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="font-semibold text-red-800">{{ stats()?.lowStockProducts }} Low Stock Products</p>
              <p class="text-sm text-red-600">Need restocking soon</p>
            </div>
            <span class="ml-auto text-red-300">→</span>
          </a>
        }
      </div>

      <!-- Recent orders -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 class="font-semibold text-navy-900">Recent Orders</h2>
          <a routerLink="/orders" class="text-sm text-gold-600 font-medium hover:underline">View all →</a>
        </div>

        @if (loading()) {
          <div class="p-6 space-y-3">
            @for (_ of [1,2,3,4,5]; track $index) {
              <div class="flex items-center gap-4">
                <div class="w-28 h-5 bg-gray-100 rounded-lg animate-pulse"></div>
                <div class="flex-1 h-5 bg-gray-100 rounded-lg animate-pulse"></div>
                <div class="w-20 h-5 bg-gray-100 rounded-lg animate-pulse"></div>
                <div class="w-20 h-5 bg-gray-100 rounded-lg animate-pulse"></div>
              </div>
            }
          </div>
        } @else {
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th class="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              @for (order of stats()?.recentOrders; track order.orderNumber) {
                <tr class="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td class="px-6 py-4 font-mono text-navy-900 font-semibold">{{ order.orderNumber }}</td>
                  <td class="px-6 py-4 text-gray-700">{{ order.customerName }}</td>
                  <td class="px-6 py-4 text-right font-semibold text-navy-900">LKR {{ order.total | number:'1.0-0' }}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                          [class]="statusClass(order.status)">{{ order.status }}</span>
                  </td>
                  <td class="px-6 py-4 text-gray-400">{{ order.createdAt | date:'MMM d, h:mm a' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        @for (action of quickActions; track action.label) {
          <a [routerLink]="action.path"
             class="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gold-200 transition-all cursor-pointer group text-center">
            <span class="text-3xl group-hover:scale-110 transition-transform">{{ action.icon }}</span>
            <span class="text-sm font-medium text-navy-700">{{ action.label }}</span>
          </a>
        }
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  kpiCards = () => {
    const s = this.stats();
    return [
      { icon: '💰', label: 'Total Revenue', value: `LKR ${(s?.totalRevenue ?? 0).toLocaleString()}`, growth: s?.revenueGrowth ?? 0 },
      { icon: '🛒', label: 'Total Orders', value: `${s?.totalOrders ?? 0}`, growth: s?.ordersGrowth ?? 0 },
      { icon: '👥', label: 'Customers', value: `${s?.totalCustomers ?? 0}`, growth: s?.customersGrowth ?? 0 },
      { icon: '📊', label: 'Avg. Order Value', value: `LKR ${(s?.avgOrderValue ?? 0).toLocaleString()}`, growth: s?.avgGrowth ?? 0 },
    ];
  };

  quickActions = [
    { icon: '➕', label: 'Add Product', path: '/products/new' },
    { icon: '🎁', label: 'Create Hamper', path: '/hampers/new' },
    { icon: '🎫', label: 'New Promo Code', path: '/promotions/new' },
    { icon: '📝', label: 'Edit Homepage', path: '/cms' },
  ];

  ngOnInit() {
    this.http.get<DashboardStats>('/api/admin/dashboard').subscribe({
      next: data => { this.stats.set(data); this.loading.set(false); },
      error: () => {
        // Fallback sample data for dev
        this.stats.set({
          totalRevenue: 485000, revenueGrowth: 12,
          totalOrders: 142, ordersGrowth: 8,
          totalCustomers: 89, customersGrowth: 15,
          avgOrderValue: 3415, avgGrowth: 4,
          pendingOrders: 5, lowStockProducts: 3,
          recentOrders: [
            { orderNumber: 'HP-001-2024', customerName: 'Priya Fernando', total: 7500, status: 'Pending', createdAt: new Date().toISOString() },
            { orderNumber: 'HP-002-2024', customerName: 'Rajan Kumaran', total: 12000, status: 'Confirmed', createdAt: new Date().toISOString() },
            { orderNumber: 'HP-003-2024', customerName: 'Sasha Mendis', total: 4500, status: 'Dispatched', createdAt: new Date().toISOString() },
          ]
        });
        this.loading.set(false);
      }
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Confirmed: 'bg-blue-100 text-blue-700',
      Processing: 'bg-indigo-100 text-indigo-700',
      Dispatched: 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700',
      Cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }
}
