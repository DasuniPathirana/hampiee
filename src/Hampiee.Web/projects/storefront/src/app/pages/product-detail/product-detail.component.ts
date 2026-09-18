import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, Product } from '../../services/api.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="container-hampiee py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div class="skeleton aspect-square rounded-2xl"></div>
          <div class="space-y-4">
            <div class="skeleton h-10 rounded-xl w-3/4"></div>
            <div class="skeleton h-6 rounded-xl w-1/2"></div>
            <div class="skeleton h-32 rounded-xl"></div>
            <div class="skeleton h-14 rounded-2xl"></div>
          </div>
        </div>
      </div>
    } @else if (product()) {
      <div class="container-hampiee py-10">
        <!-- Breadcrumb -->
        <nav class="text-sm text-gray-400 mb-8 flex items-center gap-2">
          <a routerLink="/" class="hover:text-navy-700">Home</a>
          <span>/</span>
          <a routerLink="/collections" class="hover:text-navy-700">Products</a>
          <span>/</span>
          <span class="text-navy-700">{{ product()!.name }}</span>
        </nav>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">

          <!-- Image Gallery -->
          <div class="space-y-3">
            <div class="overflow-hidden rounded-2xl bg-cream-100 aspect-square">
              <img [src]="activeImage()" [alt]="product()!.name"
                   class="w-full h-full object-cover transition-opacity duration-300"/>
            </div>
            @if (product()!.images && product()!.images!.length > 1) {
              <div class="flex gap-3 overflow-x-auto pb-1">
                @for (img of product()!.images; track img.url) {
                  <button (click)="activeImage.set(img.url)"
                          class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors"
                          [class.border-gold-500]="activeImage() === img.url"
                          [class.border-transparent]="activeImage() !== img.url">
                    <img [src]="img.url" [alt]="img.altText" class="w-full h-full object-cover"/>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Product Info -->
          <div class="flex flex-col">
            <!-- Tags -->
            @if (product()!.tags?.length) {
              <div class="flex flex-wrap gap-2 mb-4">
                @for (tag of product()!.tags; track tag) {
                  <span class="px-3 py-1 bg-gold-50 text-gold-700 rounded-full text-xs font-medium">{{ tag }}</span>
                }
              </div>
            }

            <h1 class="font-display text-3xl md:text-4xl font-bold text-navy-900 mb-3">{{ product()!.name }}</h1>

            <!-- Price -->
            <div class="flex items-center gap-3 mb-5">
              <span class="text-3xl font-bold text-navy-900">LKR {{ product()!.price | number:'1.0-0' }}</span>
              @if (product()!.compareAtPrice) {
                <span class="line-through text-gray-400 text-xl">LKR {{ product()!.compareAtPrice | number:'1.0-0' }}</span>
                <span class="px-2 py-1 bg-red-100 text-red-600 text-sm font-semibold rounded-lg">
                  -{{ product()!.discountPercentage }}%
                </span>
              }
            </div>

            <!-- Short description -->
            <p class="text-gray-600 mb-6 leading-relaxed">{{ product()!.shortDescription }}</p>

            <!-- Stock indicator -->
            <div class="flex items-center gap-2 mb-6">
              @if (product()!.hasStock) {
                <span class="w-2 h-2 rounded-full bg-ceylon-400"></span>
                <span class="text-sm text-ceylon-600 font-medium">In Stock</span>
              } @else {
                <span class="w-2 h-2 rounded-full bg-red-400"></span>
                <span class="text-sm text-red-500 font-medium">Out of Stock</span>
              }
            </div>

            <!-- Qty + Add to Cart -->
            @if (product()!.hasStock) {
              <div class="flex items-center gap-3 mb-4">
                <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button (click)="qty.set(Math.max(1, qty() - 1))"
                          class="w-12 h-12 flex items-center justify-center text-navy-700 hover:bg-gray-50 text-xl font-bold">−</button>
                  <span class="w-12 text-center font-semibold text-navy-900">{{ qty() }}</span>
                  <button (click)="qty.update(v => v + 1)"
                          class="w-12 h-12 flex items-center justify-center text-navy-700 hover:bg-gray-50 text-xl font-bold">+</button>
                </div>
                <button (click)="addToCart()" class="btn-gold flex-1 py-3 text-base font-semibold rounded-xl"
                        [class.animate-bounce]="addedPulse()">
                  @if (addedPulse()) { ✓ Added! } @else { 🛒 Add to Cart }
                </button>
              </div>
            }

            <!-- Meta info -->
            <div class="border-t border-gray-100 pt-5 mt-auto space-y-2 text-sm text-gray-500">
              @if (product()!.sku) {
                <p>SKU: <span class="text-navy-700 font-medium">{{ product()!.sku }}</span></p>
              }
              @if (product()!.brand) {
                <p>Brand: <span class="text-navy-700 font-medium">{{ product()!.brand }}</span></p>
              }
              @if (product()!.weightGrams) {
                <p>Weight: <span class="text-navy-700 font-medium">{{ product()!.weightGrams }}g</span></p>
              }
            </div>

            <!-- Trust icons -->
            <div class="flex flex-wrap gap-4 mt-6 pt-5 border-t border-gray-100">
              @for (trust of trustItems; track trust.icon) {
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>{{ trust.icon }}</span>
                  <span>{{ trust.text }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Full description -->
        @if (product()!.description) {
          <div class="mt-16 pt-10 border-t border-gray-100">
            <h2 class="font-display text-2xl font-bold text-navy-900 mb-6">Product Details</h2>
            <div class="prose max-w-none text-gray-600 leading-relaxed" [innerHTML]="product()!.description"></div>
          </div>
        }
      </div>
    } @else {
      <div class="container-hampiee py-20 text-center">
        <p class="text-gray-400">Product not found.</p>
        <a routerLink="/collections" class="btn-primary mt-4">Back to Collections</a>
      </div>
    }
  `
})
export class ProductDetailComponent implements OnInit {
  private api = inject(ApiService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);

  product = signal<Product | null>(null);
  loading = signal(true);
  activeImage = signal('');
  qty = signal(1);
  addedPulse = signal(false);
  Math = Math;

  trustItems = [
    { icon: '🚚', text: 'Island-wide delivery' },
    { icon: '🎁', text: 'Gift wrapping available' },
    { icon: '🔒', text: 'Secure checkout' },
    { icon: '↩️', text: '7-day returns' },
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.api.getProduct(params['slug']).subscribe({
        next: p => {
          this.product.set(p);
          this.activeImage.set(p.primaryImageUrl ?? p.images?.[0]?.url ?? '');
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    });
  }

  addToCart() {
    const p = this.product();
    if (!p) return;
    this.cartService.addItem({ id: p.id, type: 'product', name: p.name, slug: p.slug, imageUrl: p.primaryImageUrl ?? '', price: p.price }, this.qty());
    this.addedPulse.set(true);
    setTimeout(() => this.addedPulse.set(false), 1500);
  }
}
