import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import type { Product, Hamper } from '../../services/api.service';

interface BuildItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-hamper-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-cream-50">
      <!-- Hero Strip -->
      <div class="bg-navy-900 text-white py-10">
        <div class="container-hampiee text-center">
          <p class="text-gold-400 text-sm font-medium uppercase tracking-widest mb-2">🎁 Custom Gift</p>
          <h1 class="font-display text-4xl md:text-5xl font-bold mb-3">Build Your Perfect Hamper</h1>
          <p class="text-white/70 max-w-xl mx-auto">Pick from our curated Sri Lankan products and we'll beautifully wrap your bespoke hamper.</p>
        </div>
      </div>

      <div class="container-hampiee py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <!-- LEFT: Product Browser -->
          <div class="lg:col-span-2 space-y-5">
            <!-- Category Filter -->
            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button (click)="selectedCategory.set('')"
                      class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                      [class.bg-navy-900]="!selectedCategory()" [class.text-white]="!selectedCategory()"
                      [class.bg-white]="!!selectedCategory()" [class.text-navy-700]="!!selectedCategory()"
                      [class.border]="!!selectedCategory()" [class.border-gray-200]="!!selectedCategory()">
                All Products
              </button>
              @for (cat of categories(); track cat.id) {
                <button (click)="selectedCategory.set(cat.id)"
                        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                        [class.bg-navy-900]="selectedCategory() === cat.id" [class.text-white]="selectedCategory() === cat.id"
                        [class.bg-white]="selectedCategory() !== cat.id" [class.text-navy-700]="selectedCategory() !== cat.id"
                        [class.border]="selectedCategory() !== cat.id" [class.border-gray-200]="selectedCategory() !== cat.id">
                  {{ cat.icon }} {{ cat.name }}
                </button>
              }
            </div>

            <!-- Search -->
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input [(ngModel)]="productSearch" (ngModelChange)="onSearch()" type="search"
                     placeholder="Search products to add..." class="form-input pl-11"/>
            </div>

            <!-- Products grid -->
            @if (loadingProducts()) {
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                @for (_ of [1,2,3,4,5,6]; track $index) {
                  <div class="h-52 bg-gray-100 rounded-2xl animate-pulse"></div>
                }
              </div>
            } @else {
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                @for (product of filteredProducts(); track product.id) {
                  <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer"
                       (click)="addItem(product)">
                    <div class="aspect-square overflow-hidden bg-cream-100 relative">
                      @if (product.primaryImageUrl) {
                        <img [src]="product.primaryImageUrl" [alt]="product.name"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      } @else {
                        <div class="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                      }
                      <!-- Added badge -->
                      @if (itemCount(product.id) > 0) {
                        <div class="absolute top-2 right-2 w-6 h-6 bg-navy-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {{ itemCount(product.id) }}
                        </div>
                      }
                    </div>
                    <div class="p-3">
                      <p class="font-semibold text-navy-900 text-sm line-clamp-1">{{ product.name }}</p>
                      <p class="text-gold-600 font-bold text-sm">LKR {{ product.price | number:'1.0-0' }}</p>
                      <button class="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                              [class.border-navy-900]="itemCount(product.id) === 0"
                              [class.bg-navy-900]="itemCount(product.id) === 0"
                              [class.text-white]="itemCount(product.id) === 0"
                              [class.border-gold-400]="itemCount(product.id) > 0"
                              [class.bg-gold-50]="itemCount(product.id) > 0"
                              [class.text-gold-600]="itemCount(product.id) > 0">
                        {{ itemCount(product.id) === 0 ? '+ Add' : '+ Add More' }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- RIGHT: Builder Canvas (sticky) -->
          <div class="lg:sticky lg:top-24 space-y-5 h-fit">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="bg-navy-900 text-white px-5 py-4">
                <h2 class="font-display text-lg font-bold">Your Hamper</h2>
                <p class="text-white/60 text-xs">{{ buildItems().length }} item(s) selected</p>
              </div>

              @if (buildItems().length === 0) {
                <div class="p-8 text-center text-gray-400">
                  <p class="text-5xl mb-3">🎁</p>
                  <p class="text-sm font-medium">Your hamper is empty</p>
                  <p class="text-xs mt-1">Click products on the left to add them</p>
                </div>
              } @else {
                <div class="p-4 space-y-3 max-h-80 overflow-y-auto">
                  @for (item of buildItems(); track item.product.id) {
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg overflow-hidden bg-cream-100 flex-shrink-0">
                        @if (item.product.primaryImageUrl) {
                          <img [src]="item.product.primaryImageUrl" [alt]="item.product.name" class="w-full h-full object-cover"/>
                        } @else {
                          <div class="w-full h-full flex items-center justify-center text-lg">🎁</div>
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold text-navy-900 line-clamp-1">{{ item.product.name }}</p>
                        <p class="text-xs text-gold-600">LKR {{ (item.product.price * item.quantity) | number:'1.0-0' }}</p>
                      </div>
                      <div class="flex items-center gap-1">
                        <button (click)="decreaseItem(item.product)" class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:border-navy-300">−</button>
                        <span class="text-xs font-bold w-4 text-center">{{ item.quantity }}</span>
                        <button (click)="addItem(item.product)" class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:border-navy-300">+</button>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Gift Options -->
              <div class="px-5 pb-4 border-t border-gray-100 pt-4 space-y-3">
                <h3 class="text-sm font-semibold text-navy-900">Gift Options</h3>
                <div>
                  <label class="form-label text-xs">Gift Message (optional)</label>
                  <textarea [(ngModel)]="giftMessage" rows="2" class="form-input !text-sm resize-none"
                            placeholder="Add a personal message..."></textarea>
                </div>
                <div class="flex items-center gap-2">
                  <input [(ngModel)]="includeGiftWrap" type="checkbox" class="w-4 h-4 accent-gold-500" id="wrap"/>
                  <label for="wrap" class="text-sm text-navy-700">Include premium gift wrapping <span class="text-gold-600 font-medium">(+LKR 350)</span></label>
                </div>
              </div>

              <!-- Price Summary -->
              @if (buildItems().length > 0) {
                <div class="px-5 pb-5 space-y-2 border-t border-gray-100 pt-4">
                  <div class="flex justify-between text-sm text-gray-500">
                    <span>Items ({{ totalItemsCount() }})</span>
                    <span>LKR {{ subtotal() | number:'1.0-0' }}</span>
                  </div>
                  @if (includeGiftWrap) {
                    <div class="flex justify-between text-sm text-gray-500">
                      <span>Gift Wrapping</span>
                      <span>LKR 350</span>
                    </div>
                  }
                  <div class="flex justify-between font-bold text-navy-900 border-t border-gray-100 pt-2">
                    <span>Hamper Total</span>
                    <span class="text-gold-600">LKR {{ (subtotal() + (includeGiftWrap ? 350 : 0)) | number:'1.0-0' }}</span>
                  </div>
                  <button (click)="addToCart()" class="w-full mt-2 btn-gold rounded-xl py-3 font-semibold">
                    Add Hamper to Cart 🛒
                  </button>
                  <p class="text-center text-xs text-gray-400">Delivery calculated at checkout</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HamperBuilderComponent implements OnInit {
  private api = inject(ApiService);
  private cart = inject(CartService);

  products = signal<Product[]>([]);
  categories = signal<any[]>([]);
  loadingProducts = signal(true);
  selectedCategory = signal('');
  productSearch = '';
  buildItems = signal<BuildItem[]>([]);
  giftMessage = '';
  includeGiftWrap = false;

  filteredProducts = computed(() => {
    const catId = this.selectedCategory();
    const search = this.productSearch.toLowerCase();
    return this.products().filter(p => {
      const catMatch = !catId || p.categoryId === catId;
      const searchMatch = !search || p.name.toLowerCase().includes(search);
      return catMatch && searchMatch;
    });
  });

  subtotal = computed(() => this.buildItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0));
  totalItemsCount = computed(() => this.buildItems().reduce((sum, item) => sum + item.quantity, 0));

  itemCount(productId: string): number {
    return this.buildItems().find(i => i.product.id === productId)?.quantity ?? 0;
  }

  ngOnInit() {
    this.api.getProducts({ pageSize: 100 }).subscribe(r => { this.products.set(r.items); this.loadingProducts.set(false); });
    this.api.getCategories().subscribe(c => this.categories.set(c));
  }

  private searchTimer: any;
  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => {}, 300); }

  addItem(product: Product) {
    const current = this.buildItems();
    const existing = current.find(i => i.product.id === product.id);
    if (existing) {
      this.buildItems.set(current.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      this.buildItems.set([...current, { product, quantity: 1 }]);
    }
  }

  decreaseItem(product: Product) {
    const current = this.buildItems();
    const existing = current.find(i => i.product.id === product.id);
    if (!existing) return;
    if (existing.quantity <= 1) {
      this.buildItems.set(current.filter(i => i.product.id !== product.id));
    } else {
      this.buildItems.set(current.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity - 1 } : i));
    }
  }

  addToCart() {
    if (this.buildItems().length === 0) return;
    const hamperName = 'Custom Hamper (' + this.buildItems().map(i => i.product.name).join(', ').substring(0, 40) + '...)';
    this.cart.addItem({
      id: 'custom-' + Date.now(),
      type: 'hamper',
      name: hamperName,
      price: this.subtotal() + (this.includeGiftWrap ? 350 : 0),
      quantity: 1,
      imageUrl: this.buildItems()[0]?.product.primaryImageUrl ?? '',
      giftMessage: this.giftMessage,
      hasGiftWrap: this.includeGiftWrap,
      customItems: this.buildItems().map(i => ({ productId: i.product.id, quantity: i.quantity }))
    });
    this.buildItems.set([]);
    this.giftMessage = '';
    this.includeGiftWrap = false;
    // Show success toast
    alert('Custom hamper added to cart! 🎁');
  }
}
