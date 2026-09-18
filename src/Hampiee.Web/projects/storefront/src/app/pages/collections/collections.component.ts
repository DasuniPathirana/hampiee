import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService, Product, Hamper, Category } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <!-- Header -->
    <div class="bg-navy-900 text-white py-16">
      <div class="container-hampiee text-center">
        <p class="text-gold-400 text-sm uppercase tracking-widest mb-2">{{ categorySlug() || 'All Items' | titlecase }}</p>
        <h1 class="font-display text-4xl md:text-5xl font-bold mb-4">{{ pageTitle() }}</h1>
        <p class="text-white/60 max-w-xl mx-auto">{{ pageSubtitle() }}</p>
      </div>
    </div>

    <div class="container-hampiee py-10">
      <div class="flex flex-col lg:flex-row gap-8">

        <!-- Sidebar Filters -->
        <aside class="w-full lg:w-64 flex-shrink-0">
          <div class="bg-white rounded-2xl p-6 shadow-card">
            <h3 class="font-semibold text-navy-900 mb-4">Filters</h3>

            <!-- Type -->
            <div class="mb-6">
              <p class="text-xs uppercase tracking-wider text-gray-400 mb-3">Type</p>
              <div class="space-y-2">
                @for (type of types; track type.value) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" [value]="type.value" [(ngModel)]="activeType"
                           (change)="applyFilters()" class="accent-gold-500"/>
                    <span class="text-sm text-navy-700">{{ type.label }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Price range -->
            <div class="mb-6">
              <p class="text-xs uppercase tracking-wider text-gray-400 mb-3">Price (LKR)</p>
              <div class="space-y-2">
                @for (range of priceRanges; track range.label) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="price" [value]="range.value" [(ngModel)]="activePriceRange"
                           (change)="applyFilters()" class="accent-gold-500"/>
                    <span class="text-sm text-navy-700">{{ range.label }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Occasion categories -->
            @if (categories().length > 0) {
              <div class="mb-6">
                <p class="text-xs uppercase tracking-wider text-gray-400 mb-3">Occasion</p>
                <div class="space-y-2">
                  @for (cat of categories(); track cat.id) {
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" [value]="cat.id" [(ngModel)]="activeCategoryId"
                             (change)="applyFilters()" class="accent-gold-500"/>
                      <span class="text-sm text-navy-700">{{ cat.name }}</span>
                    </label>
                  }
                </div>
              </div>
            }

            <button (click)="clearFilters()" class="w-full btn-ghost !py-2 text-sm">Clear Filters</button>
          </div>
        </aside>

        <!-- Main content -->
        <div class="flex-1">
          <!-- Toolbar -->
          <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <p class="text-sm text-gray-500">
              @if (!loading()) { {{ totalCount() }} result{{ totalCount() === 1 ? '' : 's' }} }
            </p>
            <div class="flex items-center gap-3">
              <select [(ngModel)]="sortBy" (change)="applyFilters()"
                      class="form-input !py-2 !px-3 !text-sm w-44">
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>

          <!-- Hampers grid -->
          @if (loading()) {
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              @for (_ of [1,2,3,4,5,6]; track $index) {
                <div class="skeleton aspect-[3/4] rounded-2xl"></div>
              }
            </div>
          } @else if (hampers().length === 0 && products().length === 0) {
            <div class="text-center py-20">
              <span class="text-5xl mb-4 block">🔍</span>
              <h3 class="font-display text-xl text-navy-900 mb-2">No results found</h3>
              <p class="text-gray-400 mb-6">Try adjusting your filters</p>
              <button (click)="clearFilters()" class="btn-primary">Clear Filters</button>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <!-- Hampers -->
              @for (hamper of hampers(); track hamper.id) {
                <a [routerLink]="['/hampers', hamper.slug]" class="card group block cursor-pointer">
                  <div class="relative overflow-hidden aspect-[4/5] bg-cream-100">
                    @if (hamper.heroImageUrl) {
                      <img [src]="hamper.heroImageUrl" [alt]="hamper.name"
                           class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                    } @else {
                      <div class="w-full h-full flex items-center justify-center text-7xl">🎁</div>
                    }
                    @if (hamper.isCustomizable) {
                      <span class="absolute top-3 right-3 px-2 py-1 bg-gold-500 text-white text-xs font-semibold rounded-lg">
                        Customizable
                      </span>
                    }
                    <span class="absolute top-3 left-3 px-2 py-1 bg-navy-900/80 text-white text-xs rounded-lg">
                      Hamper
                    </span>
                  </div>
                  <div class="p-5">
                    <h3 class="font-display font-semibold text-navy-900 mb-2 group-hover:text-gold-600 transition-colors">{{ hamper.name }}</h3>
                    <p class="text-sm text-gray-400 mb-3 line-clamp-2">{{ hamper.shortDescription }}</p>
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-navy-900 text-lg">LKR {{ hamper.price | number:'1.0-0' }}</span>
                      <button (click)="addHamperToCart($event, hamper)"
                              class="w-9 h-9 rounded-full bg-gold-50 hover:bg-gold-500 text-gold-600 hover:text-white flex items-center justify-center transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </a>
              }

              <!-- Products -->
              @for (product of products(); track product.id) {
                <a [routerLink]="['/products', product.slug]" class="card group block cursor-pointer">
                  <div class="relative overflow-hidden aspect-square bg-cream-100">
                    @if (product.primaryImageUrl) {
                      <img [src]="product.primaryImageUrl" [alt]="product.name"
                           class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                    } @else {
                      <div class="w-full h-full flex items-center justify-center text-5xl">📦</div>
                    }
                    @if (product.isOnSale) {
                      <span class="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg">
                        -{{ product.discountPercentage }}%
                      </span>
                    }
                    @if (!product.hasStock) {
                      <div class="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span class="bg-gray-800 text-white text-xs px-3 py-1 rounded-full">Out of Stock</span>
                      </div>
                    }
                  </div>
                  <div class="p-4">
                    <h3 class="font-medium text-navy-900 mb-1 group-hover:text-gold-600 transition-colors line-clamp-2">{{ product.name }}</h3>
                    <div class="flex items-center justify-between mt-2">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-navy-900">LKR {{ product.price | number:'1.0-0' }}</span>
                        @if (product.compareAtPrice) {
                          <span class="line-through text-gray-400 text-sm">LKR {{ product.compareAtPrice | number:'1.0-0' }}</span>
                        }
                      </div>
                      @if (product.hasStock) {
                        <button (click)="addProductToCart($event, product)"
                                class="w-9 h-9 rounded-full bg-gold-50 hover:bg-gold-500 text-gold-600 hover:text-white flex items-center justify-center transition-all">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </div>
                </a>
              }
            </div>

            <!-- Load more -->
            @if (hasMore()) {
              <div class="text-center mt-10">
                <button (click)="loadMore()" [disabled]="loadingMore()"
                        class="btn-primary px-10 py-3">
                  @if (loadingMore()) { Loading... } @else { Load More }
                </button>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`.line-clamp-2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }`]
})
export class CollectionsComponent implements OnInit {
  private api = inject(ApiService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  hampers = signal<Hamper[]>([]);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  totalCount = signal(0);
  currentPage = signal(1);
  readonly pageSize = 12;

  categorySlug = signal<string>('');
  activeCategoryId = '';
  activeType = 'all';
  activePriceRange = '';
  sortBy = 'newest';

  types = [
    { label: 'All', value: 'all' },
    { label: 'Hampers', value: 'hampers' },
    { label: 'Products', value: 'products' },
  ];

  priceRanges = [
    { label: 'All Prices', value: '' },
    { label: 'Under LKR 2,500', value: '0-2500' },
    { label: 'LKR 2,500–5,000', value: '2500-5000' },
    { label: 'LKR 5,000–10,000', value: '5000-10000' },
    { label: 'Over LKR 10,000', value: '10000-' },
  ];

  pageTitle = computed(() => this.categorySlug() ? this.categorySlug().replace(/-/g, ' ') : 'All Collections');
  pageSubtitle = computed(() => 'Discover our curated selection of premium Sri Lankan gifts');
  hasMore = computed(() => this.hampers().length + this.products().length < this.totalCount());

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.categorySlug.set(params['slug'] ?? '');
      this.load();
    });
    this.api.getCategories().subscribe(cats => this.categories.set(cats));
  }

  private load(append = false) {
    if (!append) { this.loading.set(true); this.currentPage.set(1); }
    else this.loadingMore.set(true);

    const [min, max] = this.activePriceRange ? this.activePriceRange.split('-').map(Number) : [undefined, undefined];

    if (this.activeType !== 'products') {
      this.api.getHampers({ categoryId: this.activeCategoryId || undefined, page: this.currentPage(), pageSize: this.pageSize }).subscribe(r => {
        this.hampers.update(h => append ? [...h, ...r.items] : r.items);
        this.totalCount.set(r.totalCount);
        this.loading.set(false);
        this.loadingMore.set(false);
      });
    }

    if (this.activeType !== 'hampers') {
      this.api.getProducts({ categoryId: this.activeCategoryId || undefined, minPrice: min, maxPrice: max || undefined, page: this.currentPage(), pageSize: this.pageSize, sortBy: this.sortBy }).subscribe(r => {
        this.products.update(p => append ? [...p, ...r.items] : r.items);
        if (this.activeType === 'products') this.totalCount.set(r.totalCount);
        this.loading.set(false);
        this.loadingMore.set(false);
      });
    }
  }

  applyFilters() { this.load(); }
  clearFilters() { this.activeCategoryId = ''; this.activeType = 'all'; this.activePriceRange = ''; this.sortBy = 'newest'; this.load(); }
  loadMore() { this.currentPage.update(p => p + 1); this.load(true); }

  addHamperToCart(event: Event, hamper: Hamper) {
    event.preventDefault();
    this.cartService.addItem({ id: hamper.id, type: 'hamper', name: hamper.name, slug: hamper.slug, imageUrl: hamper.heroImageUrl ?? '', price: hamper.price });
  }

  addProductToCart(event: Event, product: Product) {
    event.preventDefault();
    this.cartService.addItem({ id: product.id, type: 'product', name: product.name, slug: product.slug, imageUrl: product.primaryImageUrl ?? '', price: product.price });
  }
}
