import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cms-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-navy-900">Content Management</h1>
          <p class="text-gray-400 text-sm">Edit banners, announcements, and page content without code</p>
        </div>
        <button (click)="openNew()" class="btn-primary text-sm px-5 py-2.5 rounded-xl">+ New Block</button>
      </div>

      <!-- CMS blocks grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="skeleton h-40 rounded-2xl"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (block of blocks(); track block.key) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
              <!-- Preview image -->
              @if (block.imageUrl) {
                <div class="aspect-[16/5] overflow-hidden bg-gray-100">
                  <img [src]="block.imageUrl" [alt]="block.title" class="w-full h-full object-cover"/>
                </div>
              }
              <div class="p-5">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="text-xs font-mono text-gold-600 bg-gold-50 px-2 py-0.5 rounded">{{ block.key }}</span>
                    <h3 class="font-semibold text-navy-900 mt-1">{{ block.title }}</h3>
                    @if (block.subtitle) { <p class="text-gray-400 text-sm">{{ block.subtitle }}</p> }
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full" [class.bg-ceylon-400]="block.isActive" [class.bg-gray-300]="!block.isActive"></span>
                    <span class="text-xs text-gray-400">{{ block.isActive ? 'Live' : 'Draft' }}</span>
                  </div>
                </div>
                <div class="flex gap-2 mt-3">
                  <button (click)="editBlock(block)" class="flex-1 text-sm border border-gray-200 rounded-xl py-1.5 hover:border-gold-300 hover:text-gold-600 transition-colors">
                    ✏️ Edit
                  </button>
                  <button (click)="toggleActive(block)" class="px-3 py-1.5 text-sm border rounded-xl transition-colors"
                          [class.border-ceylon-300]="!block.isActive" [class.text-ceylon-600]="!block.isActive"
                          [class.border-gray-200]="block.isActive" [class.text-gray-400]="block.isActive">
                    {{ block.isActive ? 'Unpublish' : 'Publish' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Edit Modal -->
      @if (editing()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 class="font-bold text-navy-900">{{ isNew() ? 'New Content Block' : 'Edit: ' + editing()!.key }}</h2>
              <button (click)="editing.set(null)" class="text-gray-400 hover:text-navy-700 text-2xl">✕</button>
            </div>
            <div class="p-6 space-y-4">
              @if (isNew()) {
                <div>
                  <label class="form-label">Block Key *</label>
                  <input [(ngModel)]="editing()!.key" type="text" class="form-input" placeholder="hero-banner, promo-strip, etc."/>
                  <p class="text-xs text-gray-400 mt-1">Unique identifier used in code. Use kebab-case.</p>
                </div>
              }
              <div>
                <label class="form-label">Title *</label>
                <input [(ngModel)]="editing()!.title" type="text" class="form-input" placeholder="Banner heading"/>
              </div>
              <div>
                <label class="form-label">Subtitle</label>
                <input [(ngModel)]="editing()!.subtitle" type="text" class="form-input" placeholder="Sub-heading or tagline"/>
              </div>
              <div>
                <label class="form-label">Body / Rich Text</label>
                <textarea [(ngModel)]="editing()!.body" rows="4" class="form-input resize-none" placeholder="HTML content..."></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Desktop Image URL</label>
                  <input [(ngModel)]="editing()!.imageUrl" type="url" class="form-input" placeholder="https://..."/>
                </div>
                <div>
                  <label class="form-label">Mobile Image URL</label>
                  <input [(ngModel)]="editing()!.mobileImageUrl" type="url" class="form-input" placeholder="https://..."/>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Link URL</label>
                  <input [(ngModel)]="editing()!.linkUrl" type="text" class="form-input" placeholder="/collections"/>
                </div>
                <div>
                  <label class="form-label">Link Text</label>
                  <input [(ngModel)]="editing()!.linkText" type="text" class="form-input" placeholder="Shop Now"/>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Schedule: From</label>
                  <input [(ngModel)]="editing()!.scheduleFrom" type="datetime-local" class="form-input"/>
                </div>
                <div>
                  <label class="form-label">Schedule: To</label>
                  <input [(ngModel)]="editing()!.scheduleTo" type="datetime-local" class="form-input"/>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input [(ngModel)]="editing()!.isActive" type="checkbox" id="isActive" class="w-4 h-4 accent-gold-500 rounded"/>
                <label for="isActive" class="text-sm font-medium text-navy-700">Publish immediately</label>
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button (click)="editing.set(null)" class="flex-1 btn-ghost py-3 rounded-xl">Cancel</button>
              <button (click)="save()" [disabled]="saving()" class="flex-1 btn-primary py-3 rounded-xl disabled:opacity-50">
                @if (saving()) { Saving... } @else { Save Block }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CmsAdminComponent implements OnInit {
  private http = inject(HttpClient);

  blocks = signal<any[]>([]);
  loading = signal(true);
  editing = signal<any>(null);
  saving = signal(false);
  isNew = signal(false);

  ngOnInit() { this.loadBlocks(); }

  loadBlocks() {
    this.http.get<any[]>('/api/cms/admin').subscribe({
      next: b => { this.blocks.set(b); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openNew() {
    this.isNew.set(true);
    this.editing.set({ key: '', title: '', subtitle: '', body: '', imageUrl: '', mobileImageUrl: '', linkUrl: '', linkText: '', isActive: true });
  }

  editBlock(block: any) {
    this.isNew.set(false);
    this.editing.set({ ...block });
  }

  toggleActive(block: any) {
    this.http.put(`/api/cms/${block.key}`, { ...block, isActive: !block.isActive }).subscribe(() => {
      this.loadBlocks();
    });
  }

  save() {
    const b = this.editing();
    if (!b) return;
    this.saving.set(true);
    const req = this.isNew()
      ? this.http.post('/api/cms', b)
      : this.http.put(`/api/cms/${b.key}`, b);
    req.subscribe({
      next: () => { this.editing.set(null); this.saving.set(false); this.loadBlocks(); },
      error: () => this.saving.set(false)
    });
  }
}
