import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-orders-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-navy-900">Orders</h1>
          <p class="text-gray-400 text-sm">Manage and track all customer orders</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-navy-300 hover:text-navy-700 transition-colors">
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <input [(ngModel)]="search" (ngModelChange)="onSearch()"
               type="search" placeholder="Search order# or customer..."
               class="form-input !py-2 flex-1 min-w-48"/>

        <select [(ngModel)]="statusFilter" (change)="load()" class="form-input !py-2 w-40">
          <option value="">All Statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
        </select>

        <input [(ngModel)]="dateFrom" (change)="load()" type="date" class="form-input !py-2 w-40"/>
        <input [(ngModel)]="dateTo" (change)="load()" type="date" class="form-input !py-2 w-40"/>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order #</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Items</th>
                <th class="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              @if (loading()) {
                @for (_ of [1,2,3,4,5]; track $index) {
                  <tr>
                    @for (__ of [1,2,3,4,5,6,7]; track $index) {
                      <td class="px-5 py-4"><div class="h-4 bg-gray-100 rounded animate-pulse"></div></td>
                    }
                  </tr>
                }
              } @else {
                @for (order of orders(); track order.orderNumber) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-5 py-4 font-mono font-semibold text-navy-900">{{ order.orderNumber }}</td>
                    <td class="px-5 py-4">
                      <p class="font-medium text-gray-800">{{ order.customerName }}</p>
                      <p class="text-xs text-gray-400">{{ order.customerEmail }}</p>
                    </td>
                    <td class="px-5 py-4 text-gray-500">{{ order.items?.length ?? 0 }} item(s)</td>
                    <td class="px-5 py-4 text-right font-semibold text-navy-900">
                      LKR {{ order.total | number:'1.0-0' }}
                    </td>
                    <td class="px-5 py-4">
                      <select [(ngModel)]="order.status" (change)="updateStatus(order)"
                              class="text-xs font-semibold rounded-full px-2 py-1 border-0 outline-none cursor-pointer"
                              [class]="statusClass(order.status)">
                        @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
                      </select>
                    </td>
                    <td class="px-5 py-4 text-gray-400 text-xs">{{ order.createdAt | date:'d MMM, h:mm a' }}</td>
                    <td class="px-5 py-4">
                      <button (click)="viewOrder(order)"
                              class="text-xs text-gold-600 font-medium hover:underline">View</button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
          <span>{{ totalCount() }} orders</span>
          <div class="flex items-center gap-2">
            <button (click)="prevPage()" [disabled]="page() === 1"
                    class="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40">← Prev</button>
            <span class="px-3 py-1.5 bg-navy-900 text-white rounded-lg font-medium">{{ page() }}</span>
            <button (click)="nextPage()" [disabled]="!hasMore()"
                    class="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>

      <!-- Order detail modal -->
      @if (selectedOrder()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="selectedOrder.set(null)">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 class="font-bold text-navy-900 text-lg">Order {{ selectedOrder()!.orderNumber }}</h2>
              <button (click)="selectedOrder.set(null)" class="text-gray-400 hover:text-navy-700 text-2xl">✕</button>
            </div>
            <div class="p-6 space-y-5">
              <!-- Customer info -->
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Customer</p>
                  <p class="font-medium text-navy-900">{{ selectedOrder()!.customerName }}</p>
                  <p class="text-gray-500">{{ selectedOrder()!.customerEmail }}</p>
                </div>
                <div>
                  <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Delivery Address</p>
                  <p class="font-medium text-navy-900">{{ selectedOrder()!.deliveryAddress?.recipientName }}</p>
                  <p class="text-gray-500">{{ selectedOrder()!.deliveryAddress?.line1 }}, {{ selectedOrder()!.deliveryAddress?.city }}</p>
                </div>
              </div>
              <!-- Items -->
              <div>
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-3">Items</p>
                <div class="space-y-2">
                  @for (item of selectedOrder()!.items; track item.id) {
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div class="flex-1">
                        <p class="font-medium text-sm text-navy-900">{{ item.name }}</p>
                        <p class="text-xs text-gray-400">Qty: {{ item.quantity }}</p>
                      </div>
                      <span class="font-semibold text-sm text-navy-900">LKR {{ item.lineTotal | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              </div>
              <!-- Totals -->
              <div class="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>LKR {{ selectedOrder()!.subTotal | number:'1.0-0' }}</span></div>
                <div class="flex justify-between text-gray-500"><span>Delivery</span><span>LKR {{ selectedOrder()!.deliveryFee | number:'1.0-0' }}</span></div>
                @if (selectedOrder()!.discountAmount > 0) {
                  <div class="flex justify-between text-ceylon-600"><span>Discount</span><span>-LKR {{ selectedOrder()!.discountAmount | number:'1.0-0' }}</span></div>
                }
                <div class="flex justify-between font-bold text-navy-900 text-base"><span>Total</span><span>LKR {{ selectedOrder()!.total | number:'1.0-0' }}</span></div>
              </div>
              <!-- Tracking -->
              <div>
                <label class="text-xs text-gray-400 uppercase tracking-wider">Tracking Number</label>
                <div class="flex gap-2 mt-1">
                  <input [(ngModel)]="trackingInput" type="text" class="form-input !py-2 flex-1" placeholder="e.g. SL123456789LK"/>
                  <button (click)="saveTracking()" class="px-4 py-2 bg-navy-900 text-white rounded-xl text-sm font-medium hover:bg-navy-800">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class OrdersAdminComponent implements OnInit {
  private http = inject(HttpClient);

  orders = signal<any[]>([]);
  loading = signal(true);
  totalCount = signal(0);
  page = signal(1);
  readonly pageSize = 20;
  hasMore = () => this.orders().length < this.totalCount();

  search = '';
  statusFilter = '';
  dateFrom = '';
  dateTo = '';
  trackingInput = '';
  selectedOrder = signal<any>(null);

  statuses = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Cancelled'];

  ngOnInit() { this.load(); }

  private searchTimer: any;
  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 400);
  }

  load() {
    this.loading.set(true);
    const params: any = { page: this.page(), pageSize: this.pageSize };
    if (this.search) params.search = this.search;
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.dateFrom) params.from = this.dateFrom;
    if (this.dateTo) params.to = this.dateTo;

    this.http.get<any>('/api/orders', { params }).subscribe({
      next: r => { this.orders.set(r.items ?? []); this.totalCount.set(r.totalCount ?? 0); this.loading.set(false); },
      error: () => { this.orders.set([]); this.loading.set(false); }
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  updateStatus(order: any) {
    this.http.patch(`/api/orders/${order.orderNumber}/status`, { status: order.status }).subscribe();
  }

  viewOrder(order: any) {
    this.selectedOrder.set(order);
    this.trackingInput = order.trackingNumber ?? '';
  }

  saveTracking() {
    const order = this.selectedOrder();
    if (!order) return;
    this.http.patch(`/api/orders/${order.orderNumber}/status`, {
      status: order.status, trackingNumber: this.trackingInput
    }).subscribe(() => { order.trackingNumber = this.trackingInput; });
  }

  exportCsv() {
    window.open(`/api/orders/export?status=${this.statusFilter}&search=${this.search}`, '_blank');
  }

  statusClass(status: string) {
    const m: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-700', Confirmed: 'bg-blue-100 text-blue-700',
      Processing: 'bg-indigo-100 text-indigo-700', Dispatched: 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700',
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }
}
