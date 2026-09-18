import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

interface OrderStatus {
  status: string;
  orderNumber: string;
  timestamp?: string;
}

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container-hampiee py-16 max-w-3xl">
      <h1 class="font-display text-3xl font-bold text-navy-900 mb-2">Track Your Order</h1>
      <p class="text-gray-400 mb-8">Real-time order status updates</p>

      @if (loading()) {
        <div class="space-y-4">
          <div class="skeleton h-20 rounded-2xl"></div>
          <div class="skeleton h-40 rounded-2xl"></div>
        </div>
      } @else if (!order()) {
        <div class="text-center py-16 bg-white rounded-2xl shadow-card">
          <span class="text-5xl">📭</span>
          <h3 class="font-display text-xl mt-4 mb-2 text-navy-900">Order Not Found</h3>
          <p class="text-gray-400 mb-6">Please check your order number</p>
          <a routerLink="/" class="btn-primary">Back to Home</a>
        </div>
      } @else {
        <!-- Order header -->
        <div class="bg-white rounded-2xl p-6 shadow-card mb-6">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p class="text-sm text-gray-400">Order Number</p>
              <p class="font-display text-xl font-bold text-navy-900">{{ order().orderNumber }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-400">Total</p>
              <p class="font-semibold text-navy-900">LKR {{ order().total | number:'1.0-0' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-400">Status</p>
              <span class="px-3 py-1 rounded-full text-sm font-semibold"
                    [class]="statusClass(order().status)">
                {{ order().status }}
              </span>
            </div>
          </div>
        </div>

        <!-- Live status badge -->
        @if (isConnected()) {
          <div class="flex items-center gap-2 text-ceylon-600 text-sm mb-4">
            <span class="w-2 h-2 bg-ceylon-400 rounded-full animate-pulse"></span>
            <span>Live tracking active</span>
          </div>
        }

        <!-- Status timeline -->
        <div class="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h3 class="font-semibold text-navy-900 mb-6">Order Journey</h3>
          <div class="relative">
            <!-- Progress line -->
            <div class="absolute left-5 top-6 bottom-6 w-0.5 bg-gray-100"></div>

            <div class="space-y-6">
              @for (milestone of milestones; track milestone.status; let i = $index) {
                <div class="flex items-start gap-4 relative">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                       [class.bg-navy-900]="isCompleted(milestone.status)"
                       [class.text-white]="isCompleted(milestone.status)"
                       [class.bg-gold-400]="isCurrent(milestone.status)"
                       [class.animate-pulse]="isCurrent(milestone.status)"
                       [class.bg-gray-100]="!isCompleted(milestone.status) && !isCurrent(milestone.status)"
                       [class.text-gray-400]="!isCompleted(milestone.status) && !isCurrent(milestone.status)">
                    <span class="text-lg">{{ milestone.icon }}</span>
                  </div>
                  <div class="flex-1 pt-1.5">
                    <p class="font-semibold text-sm"
                       [class.text-navy-900]="isCompleted(milestone.status) || isCurrent(milestone.status)"
                       [class.text-gray-400]="!isCompleted(milestone.status) && !isCurrent(milestone.status)">
                      {{ milestone.label }}
                    </p>
                    <p class="text-xs text-gray-400">{{ milestone.description }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Delivery info -->
        <div class="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h3 class="font-semibold text-navy-900 mb-4">Delivery Details</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-400">Recipient</p>
              <p class="text-navy-900 font-medium">{{ order().deliveryAddress?.recipientName }}</p>
            </div>
            <div>
              <p class="text-gray-400">Phone</p>
              <p class="text-navy-900 font-medium">{{ order().deliveryAddress?.recipientPhone }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-gray-400">Address</p>
              <p class="text-navy-900 font-medium">
                {{ order().deliveryAddress?.line1 }}, {{ order().deliveryAddress?.city }}, {{ order().deliveryAddress?.district }}
              </p>
            </div>
            @if (order().trackingNumber) {
              <div>
                <p class="text-gray-400">Tracking No.</p>
                <p class="text-navy-900 font-semibold">{{ order().trackingNumber }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Order items -->
        <div class="bg-white rounded-2xl p-6 shadow-card">
          <h3 class="font-semibold text-navy-900 mb-4">Items Ordered</h3>
          <div class="space-y-3">
            @for (item of order().items; track item.id) {
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-cream-100 flex-shrink-0 overflow-hidden">
                  @if (item.imageUrl) {
                    <img [src]="item.imageUrl" [alt]="item.name" class="w-full h-full object-cover"/>
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-xl">🎁</div>
                  }
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-navy-900">{{ item.name }}</p>
                  <p class="text-xs text-gray-400">Qty: {{ item.quantity }}</p>
                </div>
                <span class="text-sm font-semibold text-navy-900">LKR {{ item.lineTotal | number:'1.0-0' }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  order = signal<any>(null);
  loading = signal(true);
  isConnected = signal(false);
  private hubConnection?: signalR.HubConnection;

  milestones = [
    { status: 'Pending', icon: '🕐', label: 'Order Placed', description: 'We received your order' },
    { status: 'Confirmed', icon: '✓', label: 'Payment Confirmed', description: 'Your payment was verified' },
    { status: 'Processing', icon: '🛠️', label: 'Preparing Your Hamper', description: 'Our team is curating your gift' },
    { status: 'Packed', icon: '📦', label: 'Packed & Ready', description: 'Beautifully wrapped and ready to go' },
    { status: 'Dispatched', icon: '🚚', label: 'Out for Delivery', description: 'On the way to your recipient' },
    { status: 'Delivered', icon: '🎁', label: 'Delivered!', description: 'Gift delivered with love' },
  ];

  statusOrder = this.milestones.map(m => m.status);

  ngOnInit() {
    const orderNumber = this.route.snapshot.params['orderNumber'];
    this.api.getOrder(orderNumber).subscribe({
      next: o => { this.order.set(o); this.loading.set(false); this.connectSignalR(orderNumber); },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy() {
    this.hubConnection?.stop();
  }

  private connectSignalR(orderNumber: string) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.signalRUrl}/orders`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('OrderStatusChanged', (data: OrderStatus) => {
      if (data.orderNumber === orderNumber) {
        this.order.update(o => ({ ...o, status: data.status }));
      }
    });

    this.hubConnection.start()
      .then(() => {
        this.isConnected.set(true);
        this.hubConnection!.invoke('SubscribeToOrder', orderNumber);
      })
      .catch(() => this.isConnected.set(false));
  }

  isCompleted(status: string): boolean {
    const currentIdx = this.statusOrder.indexOf(this.order()?.status);
    const statusIdx = this.statusOrder.indexOf(status);
    return currentIdx > statusIdx;
  }

  isCurrent(status: string): boolean {
    return this.order()?.status === status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Confirmed': 'bg-blue-100 text-blue-700',
      'Processing': 'bg-blue-100 text-blue-700',
      'Packed': 'bg-indigo-100 text-indigo-700',
      'Dispatched': 'bg-purple-100 text-purple-700',
      'Delivered': 'bg-green-100 text-green-700',
      'Cancelled': 'bg-red-100 text-red-700',
    };
    return classes[status] ?? 'bg-gray-100 text-gray-700';
  }
}
