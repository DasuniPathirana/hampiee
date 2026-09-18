import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div class="w-full max-w-lg text-center">

        <!-- Animated check -->
        <div class="w-24 h-24 rounded-full bg-ceylon-100 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <span class="text-5xl">🎁</span>
        </div>

        <h1 class="font-display text-4xl font-bold text-navy-900 mb-3">
          Order Confirmed!
        </h1>
        <p class="text-gray-500 text-lg mb-8">
          Thank you! Your hamper is being prepared with love 🌴
        </p>

        @if (orderNumber()) {
          <div class="bg-white rounded-2xl shadow-card p-6 mb-8 text-left">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-navy-900">Order Details</h3>
              <span class="px-3 py-1 bg-ceylon-100 text-ceylon-700 rounded-full text-sm font-medium">Confirmed</span>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-400">Order Number</span>
                <span class="font-semibold text-navy-900 font-mono">{{ orderNumber() }}</span>
              </div>
              @if (order()) {
                <div class="flex justify-between">
                  <span class="text-gray-400">Total Paid</span>
                  <span class="font-semibold text-navy-900">LKR {{ order().total | number:'1.0-0' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Delivering to</span>
                  <span class="font-semibold text-navy-900">{{ order().deliveryAddress?.city }}</span>
                </div>
              }
            </div>

            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
              <span>📧</span>
              <span>Confirmation email sent to <strong class="text-navy-700">{{ order()?.customerEmail }}</strong></span>
            </div>
          </div>
        }

        <!-- What happens next -->
        <div class="bg-white rounded-2xl shadow-card p-6 mb-8 text-left">
          <h3 class="font-semibold text-navy-900 mb-4">What happens next?</h3>
          <div class="space-y-4">
            @for (step of nextSteps; track step.icon) {
              <div class="flex items-start gap-3">
                <span class="text-2xl flex-shrink-0">{{ step.icon }}</span>
                <div>
                  <p class="font-medium text-navy-900 text-sm">{{ step.title }}</p>
                  <p class="text-gray-400 text-xs">{{ step.desc }}</p>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a [routerLink]="['/orders', orderNumber()]" class="btn-primary px-8 py-3 text-sm">
            Track My Order
          </a>
          <a routerLink="/collections" class="btn-ghost px-8 py-3 text-sm">
            Continue Shopping
          </a>
        </div>

        <!-- Social share nudge -->
        <p class="text-gray-400 text-xs mt-8">
          Loved your experience? Share us on
          <a href="https://instagram.com/hampiee.lk" target="_blank" class="text-gold-600 font-medium hover:underline">
            &#64;hampiee.lk
          </a>
        </p>
      </div>
    </div>
  `
})
export class OrderSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  orderNumber = signal('');
  order = signal<any>(null);

  nextSteps = [
    { icon: '📧', title: 'Confirmation email sent', desc: 'Check your inbox for order details' },
    { icon: '🛠️', title: 'Preparing your hamper', desc: 'Our team curates your gift with care (1–2 hours)' },
    { icon: '🚚', title: 'Dispatched to you', desc: "We'll send a tracking update when it's on the way" },
    { icon: '🎁', title: 'Delivered with love', desc: 'Gift-wrapped and ready to delight the recipient' },
  ];

  ngOnInit() {
    const num = this.route.snapshot.queryParams['order'];
    if (num) {
      this.orderNumber.set(num);
      this.api.getOrder(num).subscribe(o => this.order.set(o));
    }
  }
}
