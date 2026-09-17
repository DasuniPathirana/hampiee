import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Product, Hamper, CmsBlock, Category } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';

interface OccasionCard {
  label: string;
  icon: string;
  slug: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <!-- ── Hero Section ──────────────────────────────────────────────────── -->
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy-900">
      <!-- Background image with overlay -->
      @if (heroCms()?.imageUrl) {
        <img
          [src]="heroCms()!.imageUrl!"
          [alt]="heroCms()!.title"
          class="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="eager"
        />
      } @else {
        <!-- Fallback gradient -->
        <div class="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-ceylon-900 opacity-90"></div>
      }

      <!-- Hero content -->
      <div class="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <!-- Eyebrow -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm
                    border border-white/20 text-sm font-medium text-gold-300 mb-6 animate-fade-in">
          <span>🌴</span>
          <span>Premium Sri Lankan Gifting</span>
        </div>

        <!-- Heading -->
        <h1 class="font-display text-5xl md:text-7xl font-bold mb-6 animate-slide-up text-white leading-tight">
          {{ heroCms()?.title || 'Gift with Soul,<br>Gift with Lanka' }}
        </h1>

        <!-- Sub -->
        <p class="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-slide-up font-light">
          {{ heroCms()?.subtitle || 'Curated hampers crafted from the finest Sri Lankan treasures — tea, spices, chocolates, and more.' }}
        </p>

        <!-- CTAs -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
          <a routerLink="/collections" class="btn-gold text-base px-8 py-4 rounded-full font-semibold shadow-gold">
            🎁 Shop Hampers
          </a>
          <a routerLink="/builder" class="btn-ghost border-white text-white hover:bg-white hover:text-navy-900 text-base px-8 py-4 rounded-full">
            ✨ Build Your Own
          </a>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div class="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center pt-2">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    </section>

    <!-- ── Occasions Strip ───────────────────────────────────────────────── -->
    <section class="py-12 bg-cream-50 border-b border-gray-100">
      <div class="container-hampiee">
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
          @for (occasion of occasions; track occasion.slug) {
            <a [routerLink]="['/collections', occasion.slug]"
               class="flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer
                      hover:bg-gold-50 hover:shadow-md transition-all duration-200 group text-center">
              <span class="text-4xl group-hover:scale-110 transition-transform duration-200">{{ occasion.icon }}</span>
              <span class="text-xs md:text-sm font-medium text-navy-700">{{ occasion.label }}</span>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- ── Featured Hampers ──────────────────────────────────────────────── -->
    <section class="section bg-white">
      <div class="container-hampiee">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-gold-500 font-medium text-sm uppercase tracking-widest mb-2">Our Bestsellers</p>
            <h2 class="section-title">Curated Hampers</h2>
          </div>
          <a routerLink="/collections" class="btn-ghost hidden md:flex">View All →</a>
        </div>

        @if (loadingHampers()) {
          <!-- Skeleton grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (_ of [1,2,3,4]; track $index) {
              <div class="skeleton aspect-[3/4] rounded-2xl"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (hamper of featuredHampers(); track hamper.id) {
              <a [routerLink]="['/hampers', hamper.slug]" class="card group cursor-pointer block">
                <!-- Image -->
                <div class="relative overflow-hidden aspect-[4/5] bg-cream-100">
                  @if (hamper.heroImageUrl) {
                    <img [src]="hamper.heroImageUrl" [alt]="hamper.name"
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-gold-50 to-ceylon-50">
                      🎁
                    </div>
                  }
                  @if (hamper.isCustomizable) {
                    <span class="absolute top-3 right-3 px-2 py-1 bg-gold-500 text-white text-xs font-semibold rounded-lg">
                      Customizable
                    </span>
                  }
                </div>
                <!-- Info -->
                <div class="p-4">
                  <h3 class="font-display font-semibold text-navy-900 mb-1 group-hover:text-gold-600 transition-colors">
                    {{ hamper.name }}
                  </h3>
                  <p class="text-sm text-gray-500 mb-3 line-clamp-2">{{ hamper.shortDescription }}</p>
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-navy-900">LKR {{ hamper.price | number:'1.0-0' }}</span>
                    <span class="text-gold-500 text-sm font-medium group-hover:underline">View →</span>
                  </div>
                </div>
              </a>
            }
          </div>
        }

        <div class="text-center mt-8 md:hidden">
          <a routerLink="/collections" class="btn-ghost">View All Hampers →</a>
        </div>
      </div>
    </section>

    <!-- ── Features Banner ───────────────────────────────────────────────── -->
    <section class="py-16 bg-navy-900 text-white">
      <div class="container-hampiee">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          @for (feature of features; track feature.icon) {
            <div class="flex flex-col items-center gap-3">
              <span class="text-4xl">{{ feature.icon }}</span>
              <h4 class="font-display font-semibold text-gold-300">{{ feature.title }}</h4>
              <p class="text-white/60 text-sm">{{ feature.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ── Featured Products ─────────────────────────────────────────────── -->
    <section class="section bg-cream-50">
      <div class="container-hampiee">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-gold-500 font-medium text-sm uppercase tracking-widest mb-2">Individual Items</p>
            <h2 class="section-title">Shop by Product</h2>
          </div>
          <a routerLink="/collections" class="btn-ghost hidden md:flex">View All →</a>
        </div>

        @if (loadingProducts()) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (_ of [1,2,3,4]; track $index) {
              <div class="skeleton aspect-square rounded-2xl"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            @for (product of featuredProducts(); track product.id) {
              <a [routerLink]="['/products', product.slug]" class="card group">
                <!-- Image -->
                <div class="relative overflow-hidden aspect-square bg-cream-100">
                  @if (product.primaryImageUrl) {
                    <img [src]="product.primaryImageUrl" [alt]="product.name"
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-4xl bg-cream-100">📦</div>
                  }
                  @if (product.isOnSale) {
                    <span class="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                      -{{ product.discountPercentage }}%
                    </span>
                  }
                </div>
                <!-- Info -->
                <div class="p-3">
                  <h3 class="font-medium text-navy-900 text-sm mb-1 group-hover:text-gold-600 transition-colors line-clamp-2">
                    {{ product.name }}
                  </h3>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-navy-900 text-sm">LKR {{ product.price | number:'1.0-0' }}</span>
                    @if (product.compareAtPrice) {
                      <span class="line-through text-gray-400 text-xs">LKR {{ product.compareAtPrice | number:'1.0-0' }}</span>
                    }
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <!-- ── Build Your Hamper CTA ─────────────────────────────────────────── -->
    <section class="py-20 bg-gradient-to-br from-gold-500 to-gold-600 text-white">
      <div class="container-hampiee text-center">
        <p class="text-white/80 uppercase tracking-widest text-sm mb-4">Create Something Special</p>
        <h2 class="font-display text-4xl md:text-5xl font-bold mb-6">
          Build Your Perfect Hamper
        </h2>
        <p class="text-white/80 text-lg mb-8 max-w-xl mx-auto">
          Handpick items you love — from Ceylon teas to artisan chocolates — and we'll wrap it beautifully for you.
        </p>
        <a routerLink="/builder" class="btn bg-navy-900 text-white hover:bg-navy-800 text-base px-8 py-4 rounded-full font-semibold shadow-float">
          ✨ Start Building
        </a>
      </div>
    </section>

    <!-- ── Testimonials ──────────────────────────────────────────────────── -->
    <section class="section bg-white">
      <div class="container-hampiee">
        <div class="text-center mb-12">
          <p class="text-gold-500 font-medium text-sm uppercase tracking-widest mb-2">Reviews</p>
          <h2 class="section-title">What Our Customers Say</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (review of testimonials; track review.name) {
            <div class="card p-6">
              <div class="flex gap-1 mb-3">
                @for (_ of [1,2,3,4,5]; track $index) {
                  <span class="text-gold-400 text-lg">★</span>
                }
              </div>
              <p class="text-gray-600 italic mb-4">"{{ review.text }}"</p>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gold-200 to-ceylon-200 flex items-center justify-center font-bold text-navy-900">
                  {{ review.name[0] }}
                </div>
                <div>
                  <p class="font-semibold text-navy-900 text-sm">{{ review.name }}</p>
                  <p class="text-gray-400 text-xs">{{ review.location }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `]
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private cart = inject(CartService);

  featuredHampers = signal<Hamper[]>([]);
  featuredProducts = signal<Product[]>([]);
  heroCms = signal<CmsBlock | null>(null);
  loadingHampers = signal(true);
  loadingProducts = signal(true);

  occasions: OccasionCard[] = [
    { label: 'Birthday', icon: '🎂', slug: 'birthday', description: 'Celebrate their special day' },
    { label: 'Wedding', icon: '💍', slug: 'wedding', description: 'Beautiful wedding gifts' },
    { label: 'Corporate', icon: '💼', slug: 'corporate', description: 'Impress your clients' },
    { label: 'Avurudu', icon: '🌺', slug: 'avurudu', description: 'New Year celebrations' },
    { label: 'Baby Shower', icon: '👶', slug: 'baby', description: 'Welcome the newborn' },
    { label: 'Thank You', icon: '🙏', slug: 'thank-you', description: 'Show your gratitude' },
    { label: 'Sympathy', icon: '🕊️', slug: 'sympathy', description: 'Comfort in tough times' },
  ];

  features = [
    { icon: '🚚', title: 'Island-Wide Delivery', desc: 'We deliver across all 25 districts of Sri Lanka' },
    { icon: '🎁', title: 'Beautifully Wrapped', desc: 'Every hamper is gift-wrapped and ready to impress' },
    { icon: '✍️', title: 'Personal Gift Cards', desc: 'Add a heartfelt message printed on a premium card' },
    { icon: '🔒', title: 'Secure Payments', desc: 'PayHere certified — Visa, Mastercard, eZCash & more' },
  ];

  testimonials = [
    { name: 'Priya F.', location: 'Colombo', text: 'Absolutely stunning hamper! The tea collection was beautifully presented. Will definitely order again for Avurudu.' },
    { name: 'Rajan K.', location: 'Kandy', text: 'Ordered a corporate hamper for our team. The quality and presentation exceeded expectations. Very professional!' },
    { name: 'Sasha M.', location: 'London (for family in SL)', text: 'Ordered from the UK for my mom\'s birthday in Colombo. Next-day delivery, she was overjoyed! 10/10 service.' },
  ];

  ngOnInit() {
    forkJoin({
      hampers: this.api.getFeaturedHampers(8),
      products: this.api.getFeaturedProducts(8),
      cms: this.api.getCmsBlocks(['hero-banner'])
    }).subscribe({
      next: ({ hampers, products, cms }) => {
        this.featuredHampers.set(hampers);
        this.featuredProducts.set(products);
        this.heroCms.set(cms.find(b => b.key === 'hero-banner') ?? null);
        this.loadingHampers.set(false);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.loadingHampers.set(false);
        this.loadingProducts.set(false);
      }
    });
  }
}
