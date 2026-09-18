import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, Hamper } from '../../services/api.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-hamper-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="container-hampiee py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div class="skeleton aspect-[4/5] rounded-2xl"></div>
          <div class="space-y-4">
            <div class="skeleton h-12 rounded-xl w-4/5"></div>
            <div class="skeleton h-6 rounded-xl w-1/2"></div>
            <div class="skeleton h-40 rounded-xl"></div>
            <div class="skeleton h-14 rounded-2xl"></div>
          </div>
        </div>
      </div>
    } @else if (hamper()) {
      <!-- Hero -->
      <div class="relative bg-navy-900 h-72 md:h-96 overflow-hidden">
        @if (hamper()!.heroImageUrl) {
          <img [src]="hamper()!.heroImageUrl" [alt]="hamper()!.name"
               class="w-full h-full object-cover opacity-50"/>
        }
        <div class="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
          <div class="container-hampiee">
            <nav class="text-white/60 text-sm mb-3 flex items-center gap-2">
              <a routerLink="/" class="hover:text-white">Home</a>
              <span>/</span>
              <a routerLink="/collections" class="hover:text-white">Collections</a>
              <span>/</span>
              <span class="text-white">{{ hamper()!.name }}</span>
            </nav>
            @if (hamper()!.isCustomizable) {
              <span class="inline-block px-3 py-1 bg-gold-500 text-white text-xs font-semibold rounded-full mb-3">
                ✨ Fully Customizable
              </span>
            }
            <h1 class="font-display text-3xl md:text-5xl font-bold text-white">{{ hamper()!.name }}</h1>
          </div>
        </div>
      </div>

      <div class="container-hampiee py-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">

          <!-- Image gallery -->
          <div class="lg:col-span-1 space-y-3">
            <div class="overflow-hidden rounded-2xl bg-cream-100 aspect-square">
              <img [src]="activeImage() || hamper()!.heroImageUrl" [alt]="hamper()!.name"
                   class="w-full h-full object-cover"/>
            </div>
            @if ((hamper()!.images?.length ?? 0) > 1) {
              <div class="flex gap-2 overflow-x-auto">
                @for (img of hamper()!.images; track img.url) {
                  <button (click)="activeImage.set(img.url)"
                          class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all"
                          [class.border-gold-500]="activeImage() === img.url"
                          [class.border-transparent]="activeImage() !== img.url">
                    <img [src]="img.url" [alt]="img.altText" class="w-full h-full object-cover"/>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Details -->
          <div class="lg:col-span-2 flex flex-col gap-6">

            <!-- Description + price -->
            <div class="bg-white rounded-2xl p-6 shadow-card">
              <p class="text-gray-500 leading-relaxed mb-4">{{ hamper()!.shortDescription }}</p>

              <div class="flex items-center gap-4 mb-6">
                <span class="text-3xl font-bold text-navy-900">LKR {{ hamper()!.price | number:'1.0-0' }}</span>
                @if (hamper()!.compareAtPrice) {
                  <span class="line-through text-gray-400 text-xl">LKR {{ hamper()!.compareAtPrice | number:'1.0-0' }}</span>
                }
              </div>

              <!-- Add to cart / customize -->
              <div class="flex gap-3">
                <button (click)="addToCart()"
                        class="btn-gold flex-1 py-4 text-base font-semibold rounded-xl"
                        [class.animate-bounce]="addedPulse()">
                  @if (addedPulse()) { ✓ Added to Cart! } @else { 🛒 Add to Cart }
                </button>
                @if (hamper()!.isCustomizable) {
                  <a routerLink="/builder" [queryParams]="{ base: hamper()!.id }"
                     class="btn-ghost px-5 py-4 rounded-xl">
                    ✨ Customize
                  </a>
                }
              </div>

              <!-- Trust badges -->
              <div class="flex flex-wrap gap-4 mt-5 pt-5 border-t border-gray-100">
                @for (trust of trustItems; track trust.icon) {
                  <div class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{{ trust.icon }}</span><span>{{ trust.text }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- What's inside -->
            @if (hamper()!.items?.length) {
              <div class="bg-white rounded-2xl p-6 shadow-card">
                <h3 class="font-display font-semibold text-navy-900 text-xl mb-4">What's Inside 📦</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (item of hamper()!.items; track item.productId) {
                    <div class="flex items-center gap-3 p-3 bg-cream-50 rounded-xl">
                      @if (item.product?.primaryImageUrl) {
                        <img [src]="item.product!.primaryImageUrl" [alt]="item.product!.name"
                             class="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
                      } @else {
                        <div class="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center text-xl flex-shrink-0">🎁</div>
                      }
                      <div>
                        <p class="text-sm font-medium text-navy-900">{{ item.product?.name ?? 'Premium Item' }}</p>
                        <p class="text-xs text-gray-400">Qty: {{ item.quantity }}</p>
                      </div>
                      @if (item.isSwappable) {
                        <span class="ml-auto text-xs text-gold-600 font-medium">Swappable</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Full description -->
            @if (hamper()!.description) {
              <div class="bg-white rounded-2xl p-6 shadow-card">
                <h3 class="font-display font-semibold text-navy-900 text-xl mb-4">About This Hamper</h3>
                <div class="text-gray-600 leading-relaxed" [innerHTML]="hamper()!.description"></div>
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="container-hampiee py-20 text-center">
        <p class="text-gray-400">Hamper not found.</p>
        <a routerLink="/collections" class="btn-primary mt-4">Browse Collections</a>
      </div>
    }
  `
})
export class HamperDetailComponent implements OnInit {
  private api = inject(ApiService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);

  hamper = signal<Hamper | null>(null);
  loading = signal(true);
  activeImage = signal('');
  addedPulse = signal(false);

  trustItems = [
    { icon: '🚚', text: 'Island-wide delivery' },
    { icon: '🎀', text: 'Gift wrapped' },
    { icon: '🔒', text: 'Secure payment' },
    { icon: '↩️', text: '7-day returns' },
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.api.getHamper(params['slug']).subscribe({
        next: h => {
          this.hamper.set(h);
          this.activeImage.set(h.heroImageUrl ?? h.images?.[0]?.url ?? '');
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    });
  }

  addToCart() {
    const h = this.hamper();
    if (!h) return;
    this.cartService.addItem({ id: h.id, type: 'hamper', name: h.name, slug: h.slug, imageUrl: h.heroImageUrl ?? '', price: h.price });
    this.addedPulse.set(true);
    setTimeout(() => this.addedPulse.set(false), 1500);
  }
}
