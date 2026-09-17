import { Injectable, computed, signal, inject, effect } from '@angular/core';

export interface CartItem {
  id: string;
  type: 'product' | 'hamper';
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  quantity: number;
  isCustom?: boolean;
}

export interface GiftOptions {
  message: string;
  cardDesign: string;
  includeWrap: boolean;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  // ── State ─────────────────────────────────────────────────────────────────
  private readonly STORAGE_KEY = 'hampiee_cart';

  items = signal<CartItem[]>(this.loadFromStorage());
  giftOptions = signal<GiftOptions>({ message: '', cardDesign: 'classic', includeWrap: false });
  discountCode = signal<string>('');
  discountAmount = signal<number>(0);
  isOpen = signal<boolean>(false);

  // ── Computed ──────────────────────────────────────────────────────────────
  itemCount = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  subTotal = computed(() => this.items().reduce((sum, i) => sum + i.price * i.quantity, 0));
  total = computed(() => this.subTotal() - this.discountAmount());
  isEmpty = computed(() => this.items().length === 0);

  constructor() {
    // Persist to localStorage on change
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items()));
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  addItem(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    this.items.update(items => {
      const existing = items.find(i => i.id === item.id && i.type === item.type);
      if (existing) {
        return items.map(i =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...items, { ...item, quantity }];
    });
    this.isOpen.set(true); // Open cart drawer
  }

  removeItem(id: string, type: 'product' | 'hamper'): void {
    this.items.update(items => items.filter(i => !(i.id === id && i.type === type)));
  }

  updateQuantity(id: string, type: 'product' | 'hamper', quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(id, type);
      return;
    }
    this.items.update(items =>
      items.map(i => i.id === id && i.type === type ? { ...i, quantity } : i)
    );
  }

  clearCart(): void {
    this.items.set([]);
    this.discountCode.set('');
    this.discountAmount.set(0);
  }

  applyDiscount(code: string, amount: number): void {
    this.discountCode.set(code);
    this.discountAmount.set(amount);
  }

  removeDiscount(): void {
    this.discountCode.set('');
    this.discountAmount.set(0);
  }

  openCart(): void { this.isOpen.set(true); }
  closeCart(): void { this.isOpen.set(false); }
  toggleCart(): void { this.isOpen.update(v => !v); }

  // ── Serialise for order creation ──────────────────────────────────────────
  toOrderItems(): { productId?: string; hamperId?: string; quantity: number }[] {
    return this.items().map(item => ({
      ...(item.type === 'product' ? { productId: item.id } : { hamperId: item.id }),
      quantity: item.quantity
    }));
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}
