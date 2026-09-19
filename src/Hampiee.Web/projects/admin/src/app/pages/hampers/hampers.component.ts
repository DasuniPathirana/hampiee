import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-hampers-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-navy-900">Hampers</h1>
          <p class="text-gray-400 text-sm">{{ totalCount() }} hampers configured</p>
        </div>
        <button (click)="openNew()" class="btn-primary text-sm px-5 py-2.5 rounded-xl">+ Create Hamper</button>
      </div>

      <!-- Grid of hamper cards -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (_ of [1,2,3,4,5,6]; track $index) {
            <div class="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (h of hampers(); track h.id) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
              <div class="aspect-[16/7] relative overflow-hidden bg-cream-100">
                @if (h.heroImageUrl) {
                  <img [src]="h.heroImageUrl" [alt]="h.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-5xl">🎁</div>
                }
                @if (h.isFeatured) {
                  <span class="absolute top-3 left-3 bg-gold-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">Featured</span>
                }
              </div>
              <div class="p-4">
                <div class="flex items-start justify-between mb-1">
                  <h3 class="font-semibold text-navy-900 text-sm">{{ h.name }}</h3>
                  <span class="font-bold text-gold-600 text-sm">LKR {{ h.price | number:'1.0-0' }}</span>
                </div>
                <p class="text-xs text-gray-400 line-clamp-2 mb-3">{{ h.shortDescription }}</p>
                <div class="flex items-center gap-2 text-xs">
                  <span class="px-2 py-0.5 rounded-full" [class.bg-ceylon-100]="h.isCustomizable" [class.text-ceylon-700]="h.isCustomizable" [class.bg-gray-100]="!h.isCustomizable" [class.text-gray-500]="!h.isCustomizable">
                    {{ h.isCustomizable ? '🎨 Customizable' : '📦 Fixed' }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full" [class.bg-ceylon-100]="h.isActive" [class.text-ceylon-700]="h.isActive" [class.bg-gray-100]="!h.isActive" [class.text-gray-500]="!h.isActive">
                    {{ h.isActive ? 'Live' : 'Draft' }}
                  </span>
                </div>
                <div class="mt-3 flex gap-2">
                  <button (click)="editHamper(h)" class="flex-1 text-xs border border-gray-200 rounded-xl py-1.5 hover:border-gold-300 hover:text-gold-600 transition-colors">✏️ Edit</button>
                  <button (click)="duplicateHamper(h)" class="px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:border-navy-300 transition-colors" title="Duplicate">📋</button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Create/Edit Modal -->
      @if (editing()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 class="font-bold text-navy-900 text-lg">{{ isNew() ? 'Create Hamper' : 'Edit: ' + editing()!.name }}</h2>
              <button (click)="editing.set(null)" class="text-gray-400 hover:text-navy-700 text-2xl">✕</button>
            </div>
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <label class="form-label">Hamper Name *</label>
                  <input [(ngModel)]="editing()!.name" type="text" class="form-input" (blur)="autoSlug()" placeholder="e.g. Royal Ceylon Tea Hamper"/>
                </div>
                <div>
                  <label class="form-label">Slug *</label>
                  <input [(ngModel)]="editing()!.slug" type="text" class="form-input font-mono text-sm"/>
                </div>
                <div>
                  <label class="form-label">Category</label>
                  <select [(ngModel)]="editing()!.categoryId" class="form-input">
                    <option value="">No Category</option>
                    @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
                  </select>
                </div>
              </div>

              <div>
                <label class="form-label">Short Description</label>
                <input [(ngModel)]="editing()!.shortDescription" type="text" class="form-input" placeholder="One-line summary shown on cards"/>
              </div>
              <div>
                <label class="form-label">Full Description (HTML)</label>
                <textarea [(ngModel)]="editing()!.description" rows="4" class="form-input resize-none"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Override Price (LKR)</label>
                  <input [(ngModel)]="editing()!.overridePrice" type="number" class="form-input" placeholder="Auto-calculated from items if blank"/>
                </div>
                <div>
                  <label class="form-label">Compare At Price</label>
                  <input [(ngModel)]="editing()!.compareAtPrice" type="number" class="form-input"/>
                </div>
              </div>

              <div>
                <label class="form-label">Hero Image URL</label>
                <input [(ngModel)]="editing()!.heroImageUrl" type="url" class="form-input" placeholder="https://..."/>
                @if (editing()!.heroImageUrl) {
                  <img [src]="editing()!.heroImageUrl" alt="Hero preview" class="mt-2 w-full h-32 object-cover rounded-xl"/>
                }
              </div>

              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input [(ngModel)]="editing()!.isCustomizable" type="checkbox" class="w-4 h-4 accent-gold-500"/>
                  <span class="text-sm font-medium text-navy-700">Allow Customization</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input [(ngModel)]="editing()!.isFeatured" type="checkbox" class="w-4 h-4 accent-gold-500"/>
                  <span class="text-sm font-medium text-navy-700">Feature on Homepage</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input [(ngModel)]="editing()!.isActive" type="checkbox" class="w-4 h-4 accent-gold-500"/>
                  <span class="text-sm font-medium text-navy-700">Active</span>
                </label>
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button (click)="editing.set(null)" class="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium">Cancel</button>
              <button (click)="save()" [disabled]="saving()" class="flex-1 bg-navy-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                @if (saving()) { Saving... } @else { Save Hamper }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class HampersAdminComponent implements OnInit {
  private http = inject(HttpClient);
  hampers = signal<any[]>([]);
  categories = signal<any[]>([]);
  loading = signal(true);
  totalCount = signal(0);
  editing = signal<any>(null);
  isNew = signal(false);
  saving = signal(false);

  ngOnInit() {
    this.load();
    this.http.get<any[]>('/api/categories').subscribe(c => this.categories.set(c));
  }

  load() {
    this.loading.set(true);
    this.http.get<any>('/api/hampers', { params: { pageSize: 50 } }).subscribe({
      next: r => { this.hampers.set(r.items ?? []); this.totalCount.set(r.totalCount ?? 0); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openNew() {
    this.isNew.set(true);
    this.editing.set({ name: '', slug: '', shortDescription: '', description: '', heroImageUrl: '', categoryId: '', overridePrice: null, compareAtPrice: null, isCustomizable: true, isFeatured: false, isActive: true });
  }

  editHamper(h: any) { this.isNew.set(false); this.editing.set({ ...h }); }

  duplicateHamper(h: any) {
    this.isNew.set(true);
    this.editing.set({ ...h, id: undefined, name: 'Copy of ' + h.name, slug: 'copy-' + h.slug });
  }

  autoSlug() {
    const h = this.editing();
    if (h && this.isNew() && h.name && !h.slug)
      this.editing.set({ ...h, slug: h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
  }

  save() {
    const h = this.editing();
    if (!h) return;
    this.saving.set(true);
    const req = this.isNew() ? this.http.post('/api/hampers', h) : this.http.put(`/api/hampers/${h.id}`, h);
    req.subscribe({ next: () => { this.editing.set(null); this.saving.set(false); this.load(); }, error: () => this.saving.set(false) });
  }
}
