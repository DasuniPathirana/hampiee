import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <!-- Backdrop -->
    @if (cart.isOpen()) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
           (click)="cart.closeCart()"></div>
    }

    <!-- Drawer -->
    <div class="fixed inset-y-0 right-0 w-full max-w-md z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300"
         [class.translate-x-0]="cart.isOpen()"
         [class.translate-x-full]="!cart.isOpen()">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div>
          <h2 class="font-display text-xl font-semibold text-navy-900">Your Cart</h2>
          @if (cart.itemCount() > 0) {
            <p class="text-sm text-gray-400">{{ cart.itemCount() }} item{{ cart.itemCount() === 1 ? '' : 's' }}</p>
          }
        </div>
        <button (click)="cart.closeCart()" class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-navy-900 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Items -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        @if (cart.isEmpty()) {
          <div class="flex flex-col items-center justify-center h-full text-center py-16">
            <span class="text-6xl mb-4">🎁</span>
            <h3 class="font-display text-lg text-navy-900 mb-2">Your cart is empty</h3>
            <p class="text-gray-400 text-sm mb-6">Start with one of our beautiful hampers</p>
            <a routerLink="/collections" (click)="cart.closeCart()" class="btn-primary">Shop Hampers</a>
          </div>
        } @else {
          @for (item of cart.items(); track item.id) {
            <div class="flex gap-4 bg-cream-50 rounded-2xl p-4 group">
              <!-- Image -->
              <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-cream-100">
                @if (item.imageUrl) {
                  <img [src]="item.imageUrl" [alt]="item.name" class="w-full h-full object-cover"/>
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                }
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-navy-900 text-sm leading-tight mb-1 line-clamp-2">{{ item.name }}</p>
                <p class="text-gold-600 font-semibold text-sm">LKR {{ (item.price | number:'1.0-0') }}</p>

                <!-- Qty controls -->
                <div class="flex items-center gap-2 mt-2">
                  <button (click)="cart.updateQuantity(item.id, item.type, item.quantity - 1)"
                          class="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-navy-700 hover:border-gold-400 hover:text-gold-600 transition-colors text-lg font-bold">
                    −
                  </button>
                  <span class="text-sm font-semibold text-navy-900 w-6 text-center">{{ item.quantity }}</span>
                  <button (click)="cart.updateQuantity(item.id, item.type, item.quantity + 1)"
                          class="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-navy-700 hover:border-gold-400 hover:text-gold-600 transition-colors text-lg font-bold">
                    +
                  </button>
                  <button (click)="cart.removeItem(item.id, item.type)"
                          class="ml-auto text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer: Totals + Checkout -->
      @if (!cart.isEmpty()) {
        <div class="border-t border-gray-100 px-6 py-5 space-y-4">

          <!-- Gift wrap toggle -->
          <div class="flex items-center justify-between p-3 bg-gold-50 rounded-xl">
            <div class="flex items-center gap-2">
              <span class="text-xl">🎀</span>
              <div>
                <p class="text-sm font-medium text-navy-900">Gift Wrap</p>
                <p class="text-xs text-gray-400">Premium tissue paper & ribbon</p>
              </div>
            </div>
            <button (click)="toggleWrap()"
                    class="w-11 h-6 rounded-full transition-colors duration-200 relative"
                    [class.bg-gold-500]="cart.giftOptions().includeWrap"
                    [class.bg-gray-200]="!cart.giftOptions().includeWrap">
              <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                    [class.left-0.5]="!cart.giftOptions().includeWrap"
                    [class.left-5]="cart.giftOptions().includeWrap"></span>
            </button>
          </div>

          <!-- Totals -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span class="font-medium text-navy-900">LKR {{ cart.subTotal() | number:'1.0-0' }}</span>
            </div>
            @if (cart.discountAmount() > 0) {
              <div class="flex justify-between text-ceylon-600">
                <span>Discount ({{ cart.discountCode() }})</span>
                <span>− LKR {{ cart.discountAmount() | number:'1.0-0' }}</span>
              </div>
            }
            <div class="flex justify-between text-gray-400 text-xs">
              <span>Delivery calculated at checkout</span>
            </div>
          </div>

          <div class="flex justify-between font-display text-lg font-bold text-navy-900 border-t border-gray-100 pt-3">
            <span>Total</span>
            <span>LKR {{ cart.total() | number:'1.0-0' }}</span>
          </div>

          <a routerLink="/checkout" (click)="cart.closeCart()"
             class="btn-gold w-full text-center text-base font-semibold py-4 rounded-2xl">
            Proceed to Checkout →
          </a>
          <button (click)="cart.closeCart()" routerLink="/collections"
                  class="w-full text-center text-sm text-gray-400 hover:text-navy-700 transition-colors">
            Continue Shopping
          </button>
        </div>
      }
    </div>
  `,
  styles: [`:host { display: block; position: relative; z-index: 50; }`]
})
export class CartDrawerComponent {
  cart = inject(CartService);

  toggleWrap() {
    const current = this.cart.giftOptions();
    this.cart.giftOptions.set({ ...current, includeWrap: !current.includeWrap });
  }
}
