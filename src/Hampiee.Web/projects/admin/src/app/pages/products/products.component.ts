import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-navy-900">Products</h1>
          <p class="text-gray-400 text-sm">{{ totalCount() }} products total</p>
        </div>
        <button (click)="openNew()" class="btn-primary text-sm px-5 py-2.5 rounded-xl">+ Add Product</button>
      </div>

      <!-- Filters toolbar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <input [(ngModel)]="search" (ngModelChange)="onSearch()" type="search"
               placeholder="Search products..." class="form-input !py-2 flex-1 min-w-48"/>
        <select [(ngModel)]="stockFilter" (change)="load()" class="form-input !py-2 w-36">
          <option value="">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
          <option value="in">In Stock</option>
        </select>
        <select [(ngModel)]="featuredFilter" (change)="load()" class="form-input !py-2 w-36">
          <option value="">All</option>
          <option value="true">Featured</option>
          <option value="false">Not Featured</option>
        </select>
      </div>

      <!-- Products table -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12"></th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                <th class="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                <th class="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th class="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Featured</th>
                <th class="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              @if (loading()) {
                @for (_ of [1,2,3,4,5]; track $index) {
                  <tr>
                    @for (__ of [1,2,3,4,5,6,7,8]; track $index) {
                      <td class="px-5 py-4"><div class="h-4 bg-gray-100 rounded animate-pulse"></div></td>
                    }
                  </tr>
                }
              } @else if (products().length === 0) {
                <tr><td colspan="8" class="px-5 py-16 text-center text-gray-400">
                  <p class="text-4xl mb-3">📦</p>
                  <p>No products found</p>
                  <button (click)="openNew()" class="mt-3 text-gold-600 font-medium hover:underline text-sm">Add your first product</button>
                </td></tr>
              } @else {
                @for (product of products(); track product.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-3 py-3">
                      <div class="w-12 h-12 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0">
                        @if (product.primaryImageUrl) {
                          <img [src]="product.primaryImageUrl" [alt]="product.name" class="w-full h-full object-cover"/>
                        } @else {
                          <div class="w-full h-full flex items-center justify-center text-xl">📦</div>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <p class="font-semibold text-navy-900">{{ product.name }}</p>
                      <p class="text-xs text-gray-400 font-mono">{{ product.sku || product.slug }}</p>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <p class="font-semibold text-navy-900">LKR {{ product.price | number:'1.0-0' }}</p>
                      @if (product.compareAtPrice) {
                        <p class="text-xs line-through text-gray-400">LKR {{ product.compareAtPrice | number:'1.0-0' }}</p>
                      }
                    </td>
                    <td class="px-5 py-4 text-center">
                      <span class="font-semibold text-sm"
                            [class.text-ceylon-600]="product.stockQuantity > 5"
                            [class.text-yellow-600]="product.stockQuantity > 0 && product.stockQuantity <= 5"
                            [class.text-red-500]="product.stockQuantity === 0">
                        {{ product.stockQuantity }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-gray-500 text-xs">{{ product.categoryName || '—' }}</td>
                    <td class="px-5 py-4 text-center">
                      <button (click)="toggleFeatured(product)"
                              class="text-xl" [title]="product.isFeatured ? 'Remove from featured' : 'Mark as featured'">
                        {{ product.isFeatured ? '⭐' : '☆' }}
                      </button>
                    </td>
                    <td class="px-5 py-4 text-center">
                      <span class="px-2 py-1 rounded-full text-xs font-semibold"
                            [class.bg-ceylon-100]="product.isActive" [class.text-ceylon-700]="product.isActive"
                            [class.bg-gray-100]="!product.isActive" [class.text-gray-500]="!product.isActive">
                        {{ product.isActive ? 'Active' : 'Draft' }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <button (click)="editProduct(product)"
                              class="text-xs text-gold-600 font-medium hover:underline">Edit</button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
          <span>{{ totalCount() }} products</span>
          <div class="flex items-center gap-2">
            <button (click)="prevPage()" [disabled]="page() === 1"
                    class="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40">← Prev</button>
            <span class="px-3 py-1.5 bg-navy-900 text-white rounded-lg font-medium text-xs">{{ page() }}</span>
            <button (click)="nextPage()" [disabled]="!hasMore()"
                    class="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Edit / Create Modal -->
    @if (editing()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
          <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <h2 class="font-bold text-navy-900 text-lg">{{ isNew() ? 'New Product' : 'Edit Product' }}</h2>
            <button (click)="editing.set(null)" class="text-gray-400 hover:text-navy-700 text-2xl">✕</button>
          </div>

          <div class="p-6 space-y-5">
            <!-- Basic info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="form-label">Product Name *</label>
                <input [(ngModel)]="editing()!.name" type="text" class="form-input"
                       (blur)="autoSlug()" placeholder="e.g. Ceylon Tea Collection"/>
              </div>
              <div>
                <label class="form-label">Slug *</label>
                <input [(ngModel)]="editing()!.slug" type="text" class="form-input font-mono text-sm"
                       placeholder="ceylon-tea-collection"/>
              </div>
              <div>
                <label class="form-label">SKU</label>
                <input [(ngModel)]="editing()!.sku" type="text" class="form-input font-mono text-sm"
                       placeholder="HAM-TEA-001"/>
              </div>
            </div>

            <div>
              <label class="form-label">Short Description *</label>
              <input [(ngModel)]="editing()!.shortDescription" type="text" class="form-input"
                     placeholder="One-line summary shown in product cards"/>
            </div>

            <div>
              <label class="form-label">Full Description (HTML)</label>
              <textarea [(ngModel)]="editing()!.description" rows="4" class="form-input resize-none"
                        placeholder="Detailed description with HTML..."></textarea>
            </div>

            <!-- Pricing -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label class="form-label">Price (LKR) *</label>
                <input [(ngModel)]="editing()!.price" type="number" class="form-input" placeholder="2500"/>
              </div>
              <div>
                <label class="form-label">Compare At Price</label>
                <input [(ngModel)]="editing()!.compareAtPrice" type="number" class="form-input" placeholder="3500"/>
              </div>
              <div>
                <label class="form-label">Cost Price</label>
                <input [(ngModel)]="editing()!.costPrice" type="number" class="form-input" placeholder="1200"/>
              </div>
            </div>

            <!-- Stock -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label class="form-label">Stock Quantity</label>
                <input [(ngModel)]="editing()!.stockQuantity" type="number" class="form-input" placeholder="100"/>
              </div>
              <div>
                <label class="form-label">Low Stock Alert At</label>
                <input [(ngModel)]="editing()!.lowStockThreshold" type="number" class="form-input" placeholder="5"/>
              </div>
              <div>
                <label class="form-label">Weight (grams)</label>
                <input [(ngModel)]="editing()!.weightGrams" type="number" class="form-input" placeholder="500"/>
              </div>
            </div>

            <!-- Image URL -->
            <div>
              <label class="form-label">Primary Image URL</label>
              <input [(ngModel)]="editing()!.primaryImageUrl" type="url" class="form-input"
                     placeholder="https://images.unsplash.com/..."/>
              @if (editing()!.primaryImageUrl) {
                <img [src]="editing()!.primaryImageUrl" alt="Preview"
                     class="mt-2 w-24 h-24 rounded-xl object-cover border border-gray-200"/>
              }
            </div>

            <!-- Category -->
            <div>
              <label class="form-label">Category</label>
              <select [(ngModel)]="editing()!.categoryId" class="form-input">
                <option value="">No Category</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <!-- Tags -->
            <div>
              <label class="form-label">Tags (comma separated)</label>
              <input [(ngModel)]="tagInput" type="text" class="form-input"
                     placeholder="tea, ceylon, gift, premium"/>
            </div>

            <!-- Toggles -->
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input [(ngModel)]="editing()!.isFeatured" type="checkbox" class="w-4 h-4 accent-gold-500"/>
                <span class="text-sm font-medium text-navy-700">Featured on homepage</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input [(ngModel)]="editing()!.isActive" type="checkbox" class="w-4 h-4 accent-gold-500"/>
                <span class="text-sm font-medium text-navy-700">Active (visible to customers)</span>
              </label>
            </div>

            @if (saveError()) {
              <div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {{ saveError() }}
              </div>
            }
          </div>

          <div class="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
            <button (click)="editing.set(null)" class="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium hover:border-gray-300">Cancel</button>
            <button (click)="save()" [disabled]="saving()"
                    class="flex-1 bg-navy-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-navy-800 disabled:opacity-50">
              @if (saving()) { Saving... } @else { Save Product }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ProductsAdminComponent implements OnInit {
  private http = inject(HttpClient);

  products = signal<any[]>([]);
  categories = signal<any[]>([]);
  loading = signal(true);
  totalCount = signal(0);
  page = signal(1);
  readonly pageSize = 20;

  search = '';
  stockFilter = '';
  featuredFilter = '';
  tagInput = '';

  editing = signal<any>(null);
  isNew = signal(false);
  saving = signal(false);
  saveError = signal('');

  hasMore = () => this.page() * this.pageSize < this.totalCount();

  ngOnInit() {
    this.load();
    this.http.get<any[]>('/api/categories').subscribe(c => this.categories.set(c));
  }

  private searchTimer: any;
  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(), 400); }

  load() {
    this.loading.set(true);
    const params: any = { page: this.page(), pageSize: this.pageSize };
    if (this.search) params.q = this.search;
    if (this.stockFilter) params.stock = this.stockFilter;
    if (this.featuredFilter) params.featured = this.featuredFilter;

    this.http.get<any>('/api/products', { params }).subscribe({
      next: r => { this.products.set(r.items ?? []); this.totalCount.set(r.totalCount ?? 0); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  openNew() {
    this.isNew.set(true);
    this.tagInput = '';
    this.editing.set({
      name: '', slug: '', sku: '', shortDescription: '', description: '',
      price: 0, compareAtPrice: null, costPrice: null,
      stockQuantity: 0, lowStockThreshold: 5, weightGrams: null,
      primaryImageUrl: '', categoryId: '', isFeatured: false, isActive: true
    });
  }

  editProduct(p: any) {
    this.isNew.set(false);
    this.tagInput = p.tags?.join(', ') ?? '';
    this.editing.set({ ...p });
  }

  autoSlug() {
    const p = this.editing();
    if (p && this.isNew() && p.name && !p.slug) {
      p.slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      this.editing.set({ ...p });
    }
  }

  toggleFeatured(product: any) {
    this.http.patch(`/api/products/${product.id}/featured`, { isFeatured: !product.isFeatured }).subscribe(() => {
      product.isFeatured = !product.isFeatured;
    });
  }

  save() {
    const p = this.editing();
    if (!p) return;
    this.saving.set(true);
    this.saveError.set('');
    p.tags = this.tagInput.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

    const req = this.isNew()
      ? this.http.post('/api/products', p)
      : this.http.put(`/api/products/${p.id}`, p);

    req.subscribe({
      next: () => { this.editing.set(null); this.saving.set(false); this.load(); },
      error: err => { this.saveError.set(err.error?.message ?? 'Save failed'); this.saving.set(false); }
    });
  }
}
