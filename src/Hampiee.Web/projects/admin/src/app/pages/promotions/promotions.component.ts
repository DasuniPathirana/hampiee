import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-promotions-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-navy-900">Promotions</h1>
          <p class="text-gray-400 text-sm">Manage discount codes and promotions</p>
        </div>
        <button (click)="openNew()" class="btn-primary text-sm px-5 py-2.5 rounded-xl">+ New Promo Code</button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
              <th class="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
              <th class="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Uses</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Validity</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            @for (promo of promos(); track promo.id) {
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-5 py-4">
                  <span class="font-mono font-bold text-navy-900 bg-navy-50 px-2 py-1 rounded-lg text-sm">{{ promo.code }}</span>
                </td>
                <td class="px-5 py-4 text-gray-600">{{ promo.description }}</td>
                <td class="px-5 py-4 text-gray-500">{{ promo.discountType }}</td>
                <td class="px-5 py-4 text-right font-semibold text-gold-600">
                  @if (promo.discountType === 'Percentage') { {{ promo.discountValue }}% }
                  @else if (promo.discountType === 'Fixed') { LKR {{ promo.discountValue | number:'1.0-0' }} }
                  @else { Free Delivery }
                </td>
                <td class="px-5 py-4 text-right text-gray-500">
                  {{ promo.timesUsed }}{{ promo.maxUses ? ' / ' + promo.maxUses : '' }}
                </td>
                <td class="px-5 py-4 text-xs text-gray-400">
                  {{ promo.validFrom | date:'d MMM' }} → {{ promo.validTo | date:'d MMM yy' }}
                </td>
                <td class="px-5 py-4">
                  <span class="px-2 py-1 rounded-full text-xs font-semibold"
                        [class.bg-ceylon-100]="promo.isActive" [class.text-ceylon-700]="promo.isActive"
                        [class.bg-gray-100]="!promo.isActive" [class.text-gray-500]="!promo.isActive">
                    {{ promo.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <button (click)="editPromo(promo)" class="text-xs text-gold-600 font-medium hover:underline">Edit</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Edit/Create Modal -->
      @if (editing()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 class="font-bold text-navy-900">{{ isNew() ? 'New Promo Code' : 'Edit ' + editing()!.code }}</h2>
              <button (click)="editing.set(null)" class="text-gray-400 hover:text-navy-700 text-xl">✕</button>
            </div>
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Code *</label>
                  <input [(ngModel)]="editing()!.code" type="text" class="form-input uppercase" placeholder="SAVE20"/>
                </div>
                <div>
                  <label class="form-label">Discount Type</label>
                  <select [(ngModel)]="editing()!.discountType" class="form-input">
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (LKR)</option>
                    <option value="FreeDelivery">Free Delivery</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Discount Value</label>
                  <input [(ngModel)]="editing()!.discountValue" type="number" class="form-input" placeholder="20"/>
                </div>
                <div>
                  <label class="form-label">Min. Order Amount (LKR)</label>
                  <input [(ngModel)]="editing()!.minimumOrderAmount" type="number" class="form-input" placeholder="0"/>
                </div>
              </div>
              <div>
                <label class="form-label">Description</label>
                <input [(ngModel)]="editing()!.description" type="text" class="form-input" placeholder="20% off your first order"/>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Valid From</label>
                  <input [(ngModel)]="editing()!.validFrom" type="datetime-local" class="form-input"/>
                </div>
                <div>
                  <label class="form-label">Valid To</label>
                  <input [(ngModel)]="editing()!.validTo" type="datetime-local" class="form-input"/>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Max Uses (0 = unlimited)</label>
                  <input [(ngModel)]="editing()!.maxUses" type="number" class="form-input"/>
                </div>
                <div>
                  <label class="form-label">Max Uses Per Customer</label>
                  <input [(ngModel)]="editing()!.maxUsesPerCustomer" type="number" class="form-input"/>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input [(ngModel)]="editing()!.isActive" type="checkbox" class="w-4 h-4 accent-gold-500"/>
                <label class="text-sm font-medium text-navy-700">Active</label>
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button (click)="editing.set(null)" class="flex-1 btn-ghost py-3 rounded-xl">Cancel</button>
              <button (click)="save()" class="flex-1 btn-primary py-3 rounded-xl">Save</button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PromotionsAdminComponent implements OnInit {
  private http = inject(HttpClient);
  promos = signal<any[]>([]);
  loading = signal(true);
  editing = signal<any>(null);
  isNew = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any[]>('/api/promotions').subscribe({
      next: p => { this.promos.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openNew() {
    this.isNew.set(true);
    this.editing.set({ code: '', description: '', discountType: 'Percentage', discountValue: 10, minimumOrderAmount: 0, maxUses: 0, maxUsesPerCustomer: 1, isActive: true });
  }

  editPromo(promo: any) { this.isNew.set(false); this.editing.set({ ...promo }); }

  save() {
    const p = this.editing();
    if (!p) return;
    const req = this.isNew()
      ? this.http.post('/api/promotions', p)
      : this.http.put(`/api/promotions/${p.id}`, p);
    req.subscribe(() => { this.editing.set(null); this.load(); });
  }
}
