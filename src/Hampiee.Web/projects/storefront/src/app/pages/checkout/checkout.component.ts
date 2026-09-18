import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

interface DeliveryZoneInfo {
  available: boolean;
  zoneId?: string;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  estimatedDelivery?: string;
  isSameDay?: boolean;
  slots?: { id: string; label: string; startTime: string; endTime: string }[];
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="bg-cream-50 min-h-screen py-10">
      <div class="container-hampiee max-w-6xl">

        <!-- Header -->
        <div class="mb-8">
          <a routerLink="/" class="font-display text-2xl font-bold text-navy-900">Hampiee</a>
          <div class="flex items-center gap-2 mt-4 text-sm">
            @for (step of steps; track step.num; let i = $index) {
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                     [class.bg-navy-900]="currentStep() >= step.num" [class.text-white]="currentStep() >= step.num"
                     [class.bg-gray-200]="currentStep() < step.num" [class.text-gray-500]="currentStep() < step.num">
                  {{ step.num }}
                </div>
                <span [class.text-navy-700]="currentStep() >= step.num" [class.text-gray-400]="currentStep() < step.num"
                      class="hidden sm:inline font-medium">{{ step.label }}</span>
              </div>
              @if (i < steps.length - 1) { <div class="flex-1 h-px bg-gray-200 max-w-12"></div> }
            }
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left: Form -->
          <div class="lg:col-span-2 space-y-6">

            <!-- Step 1: Delivery Info -->
            @if (currentStep() === 1) {
              <div class="bg-white rounded-2xl p-6 shadow-card">
                <h2 class="font-display text-xl font-bold text-navy-900 mb-6">Delivery Information</h2>

                <form [formGroup]="deliveryForm" class="space-y-4">
                  <!-- Contact -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="form-label">First Name *</label>
                      <input formControlName="firstName" type="text" class="form-input"
                             placeholder="Ayesha" />
                    </div>
                    <div>
                      <label class="form-label">Last Name *</label>
                      <input formControlName="lastName" type="text" class="form-input"
                             placeholder="Fernando" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="form-label">Email *</label>
                      <input formControlName="email" type="email" class="form-input"
                             placeholder="you@example.com" />
                    </div>
                    <div>
                      <label class="form-label">Phone *</label>
                      <input formControlName="phone" type="tel" class="form-input"
                             placeholder="077 123 4567" />
                    </div>
                  </div>

                  <hr class="border-gray-100 my-2"/>
                  <h3 class="font-semibold text-navy-900 text-sm uppercase tracking-wider">Delivery Address</h3>

                  <div>
                    <label class="form-label">Recipient Name *</label>
                    <input formControlName="recipientName" type="text" class="form-input"
                           placeholder="Who should we deliver to?" />
                  </div>

                  <div>
                    <label class="form-label">Recipient Phone *</label>
                    <input formControlName="recipientPhone" type="tel" class="form-input"
                           placeholder="077 987 6543" />
                  </div>

                  <div>
                    <label class="form-label">Address Line 1 *</label>
                    <input formControlName="line1" type="text" class="form-input"
                           placeholder="No. 12, Galle Road" />
                  </div>

                  <div>
                    <label class="form-label">Address Line 2</label>
                    <input formControlName="line2" type="text" class="form-input"
                           placeholder="Apt, Floor, etc." />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="form-label">City *</label>
                      <input formControlName="city" type="text" class="form-input" placeholder="Colombo" />
                    </div>
                    <div>
                      <label class="form-label">District *</label>
                      <select formControlName="district" (change)="checkDelivery()" class="form-input">
                        <option value="">Select district</option>
                        @for (d of sriLankaDistricts; track d) {
                          <option [value]="d">{{ d }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </form>

                <!-- Delivery zone info -->
                @if (zoneInfo()) {
                  <div class="mt-4 p-4 rounded-xl"
                       [class.bg-ceylon-50]="zoneInfo()!.available"
                       [class.bg-red-50]="!zoneInfo()!.available">
                    @if (zoneInfo()!.available) {
                      <div class="flex items-center gap-2 text-ceylon-700">
                        <span>✓</span>
                        <span class="font-medium text-sm">
                          Delivery available · {{ zoneInfo()!.estimatedDelivery }}
                          @if (zoneInfo()!.deliveryFee === 0) { · <strong>FREE Delivery!</strong> }
                          @else { · LKR {{ zoneInfo()!.deliveryFee | number:'1.0-0' }} }
                        </span>
                      </div>
                      @if (zoneInfo()!.slots?.length) {
                        <div class="mt-3">
                          <p class="text-xs text-gray-500 mb-2">Preferred delivery slot:</p>
                          <div class="grid grid-cols-2 gap-2">
                            @for (slot of zoneInfo()!.slots; track slot.id) {
                              <label class="cursor-pointer">
                                <input type="radio" name="slot" [value]="slot.label" [(ngModel)]="selectedSlot" class="sr-only"/>
                                <div class="border rounded-lg p-2 text-xs text-center transition-all"
                                     [class.border-gold-500]="selectedSlot === slot.label"
                                     [class.bg-gold-50]="selectedSlot === slot.label"
                                     [class.border-gray-200]="selectedSlot !== slot.label">
                                  {{ slot.label }}
                                </div>
                              </label>
                            }
                          </div>
                        </div>
                      }
                    } @else {
                      <p class="text-red-600 text-sm">⚠️ Delivery not available to this district yet. We're expanding soon!</p>
                    }
                  </div>
                }

                <button (click)="goToStep2()"
                        [disabled]="!deliveryForm.valid || (zoneInfo() !== null && !zoneInfo()?.available)"
                        class="btn-primary w-full mt-6 py-4 text-base font-semibold rounded-xl disabled:opacity-50">
                  Continue to Gift Options →
                </button>
              </div>
            }

            <!-- Step 2: Gift Options -->
            @if (currentStep() === 2) {
              <div class="bg-white rounded-2xl p-6 shadow-card">
                <h2 class="font-display text-xl font-bold text-navy-900 mb-6">Gift Options</h2>

                <div class="space-y-6">
                  <!-- Gift message -->
                  <div>
                    <label class="form-label">Gift Message</label>
                    <textarea [(ngModel)]="giftMessage" rows="3" class="form-input resize-none"
                              placeholder="Write a heartfelt message... (optional)"></textarea>
                    <p class="text-xs text-gray-400 mt-1">{{ giftMessage.length }}/200 characters · Printed on a premium card</p>
                  </div>

                  <!-- Card design -->
                  <div>
                    <label class="form-label">Card Design</label>
                    <div class="grid grid-cols-3 gap-3">
                      @for (design of cardDesigns; track design.id) {
                        <label class="cursor-pointer">
                          <input type="radio" name="design" [value]="design.id" [(ngModel)]="selectedCardDesign" class="sr-only"/>
                          <div class="border-2 rounded-xl p-3 text-center transition-all"
                               [class.border-gold-500]="selectedCardDesign === design.id"
                               [class.bg-gold-50]="selectedCardDesign === design.id"
                               [class.border-gray-200]="selectedCardDesign !== design.id">
                            <span class="text-2xl">{{ design.icon }}</span>
                            <p class="text-xs mt-1 font-medium text-navy-700">{{ design.label }}</p>
                          </div>
                        </label>
                      }
                    </div>
                  </div>

                  <!-- Gift wrap toggle -->
                  <div class="flex items-center justify-between p-4 bg-gold-50 rounded-xl">
                    <div>
                      <p class="font-medium text-navy-900">🎀 Premium Gift Wrap</p>
                      <p class="text-xs text-gray-500">Tissue paper, ribbon & wax seal — FREE</p>
                    </div>
                    <button (click)="includeWrap = !includeWrap"
                            class="w-11 h-6 rounded-full transition-colors duration-200 relative"
                            [class.bg-gold-500]="includeWrap" [class.bg-gray-200]="!includeWrap">
                      <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                            [class.left-0.5]="!includeWrap" [class.left-5]="includeWrap"></span>
                    </button>
                  </div>

                  <!-- Discount code -->
                  <div>
                    <label class="form-label">Discount Code</label>
                    <div class="flex gap-2">
                      <input [(ngModel)]="promoCode" type="text" class="form-input flex-1" placeholder="HAMPIEE10" />
                      <button (click)="applyPromo()" class="btn-ghost px-5" [disabled]="!promoCode.trim()">Apply</button>
                    </div>
                    @if (promoResult()) {
                      <p class="text-sm mt-2" [class.text-ceylon-600]="promoResult()!.valid" [class.text-red-500]="!promoResult()!.valid">
                        @if (promoResult()!.valid) {
                          ✓ {{ promoResult()!.description }} — LKR {{ promoResult()!.discount | number:'1.0-0' }} off
                        } @else {
                          ✕ {{ promoResult()!.message }}
                        }
                      </p>
                    }
                  </div>
                </div>

                <div class="flex gap-3 mt-6">
                  <button (click)="currentStep.set(1)" class="btn-ghost flex-1 py-3 rounded-xl">← Back</button>
                  <button (click)="placeOrder()" [disabled]="placing()"
                          class="btn-gold flex-1 py-4 text-base font-semibold rounded-xl disabled:opacity-50">
                    @if (placing()) { Processing... } @else { Pay with PayHere →  }
                  </button>
                </div>
              </div>
            }

            <!-- Error -->
            @if (orderError()) {
              <div class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm">
                ⚠️ {{ orderError() }}
              </div>
            }
          </div>

          <!-- Right: Order Summary -->
          <div class="space-y-4">
            <div class="bg-white rounded-2xl p-5 shadow-card sticky top-24">
              <h3 class="font-display font-bold text-navy-900 mb-4">Order Summary</h3>

              <div class="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
                @for (item of cart.items(); track item.id) {
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-cream-100 flex-shrink-0 overflow-hidden">
                      @if (item.imageUrl) {
                        <img [src]="item.imageUrl" [alt]="item.name" class="w-full h-full object-cover"/>
                      } @else {
                        <div class="w-full h-full flex items-center justify-center text-xl">🎁</div>
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-navy-900 leading-tight line-clamp-1">{{ item.name }}</p>
                      <p class="text-xs text-gray-400">Qty: {{ item.quantity }}</p>
                    </div>
                    <span class="text-sm font-semibold text-navy-900 flex-shrink-0">
                      LKR {{ (item.price * item.quantity) | number:'1.0-0' }}
                    </span>
                  </div>
                }
              </div>

              <div class="space-y-2 pt-4 border-t border-gray-100 text-sm">
                <div class="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>LKR {{ cart.subTotal() | number:'1.0-0' }}</span>
                </div>
                <div class="flex justify-between text-gray-500">
                  <span>Delivery</span>
                  <span>
                    @if (zoneInfo()?.deliveryFee === 0) { FREE }
                    @else if (zoneInfo()?.deliveryFee) { LKR {{ zoneInfo()!.deliveryFee | number:'1.0-0' }} }
                    @else { Calculated at delivery }
                  </span>
                </div>
                @if (discountAmount > 0) {
                  <div class="flex justify-between text-ceylon-600">
                    <span>Discount</span>
                    <span>− LKR {{ discountAmount | number:'1.0-0' }}</span>
                  </div>
                }
                <div class="flex justify-between font-bold text-navy-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>LKR {{ orderTotal() | number:'1.0-0' }}</span>
                </div>
              </div>

              <!-- Payment security note -->
              <div class="mt-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                <span>🔒</span> <span>Secured by PayHere · Visa · Mastercard · eZCash</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden PayHere form -->
    <form id="payhere-form" method="post" [action]="payHereUrl" #payForm>
      <input type="hidden" name="merchant_id" [value]="paymentData?.merchant_id ?? ''" />
      <input type="hidden" name="return_url" [value]="paymentData?.return_url ?? ''" />
      <input type="hidden" name="cancel_url" [value]="paymentData?.cancel_url ?? ''" />
      <input type="hidden" name="notify_url" [value]="paymentData?.notify_url ?? ''" />
      <input type="hidden" name="order_id" [value]="paymentData?.order_id ?? ''" />
      <input type="hidden" name="items" [value]="paymentData?.items ?? ''" />
      <input type="hidden" name="currency" [value]="paymentData?.currency ?? 'LKR'" />
      <input type="hidden" name="amount" [value]="paymentData?.amount ?? ''" />
      <input type="hidden" name="first_name" [value]="paymentData?.first_name ?? ''" />
      <input type="hidden" name="last_name" [value]="paymentData?.last_name ?? ''" />
      <input type="hidden" name="email" [value]="paymentData?.email ?? ''" />
      <input type="hidden" name="phone" [value]="paymentData?.phone ?? ''" />
      <input type="hidden" name="hash" [value]="paymentData?.hash ?? ''" />
    </form>
  `,
  styles: [`.line-clamp-1 { display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}`]
})
export class CheckoutComponent implements OnInit {
  private api = inject(ApiService);
  cart = inject(CartService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentStep = signal(1);
  zoneInfo = signal<DeliveryZoneInfo | null>(null);
  placing = signal(false);
  orderError = signal('');
  promoResult = signal<any>(null);
  paymentData: any = null;

  payHereUrl = 'https://sandbox.payhere.lk/pay/checkout';
  selectedSlot = '';
  giftMessage = '';
  selectedCardDesign = 'classic';
  includeWrap = true;
  promoCode = '';
  discountAmount = 0;

  steps = [
    { num: 1, label: 'Delivery' },
    { num: 2, label: 'Gift Options' },
    { num: 3, label: 'Payment' },
  ];

  cardDesigns = [
    { id: 'classic', icon: '🎀', label: 'Classic' },
    { id: 'birthday', icon: '🎂', label: 'Birthday' },
    { id: 'wedding', icon: '💍', label: 'Wedding' },
    { id: 'avurudu', icon: '🌺', label: 'Avurudu' },
    { id: 'corporate', icon: '💼', label: 'Corporate' },
    { id: 'minimal', icon: '✨', label: 'Minimal' },
  ];

  deliveryForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    recipientName: ['', Validators.required],
    recipientPhone: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    district: ['', Validators.required],
  });

  sriLankaDistricts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Moneragala', 'Ratnapura', 'Kegalle'
  ];

  orderTotal(): number {
    const deliveryFee = this.zoneInfo()?.deliveryFee ?? 0;
    return this.cart.subTotal() + deliveryFee - this.discountAmount;
  }

  ngOnInit() {
    if (this.cart.isEmpty()) this.router.navigate(['/cart']);

    const user = this.auth.user();
    if (user) {
      this.deliveryForm.patchValue({ email: user.email });
    }
  }

  checkDelivery() {
    const district = this.deliveryForm.get('district')?.value;
    if (!district) return;
    this.api.checkDelivery(district, this.cart.subTotal()).subscribe(info => {
      this.zoneInfo.set(info as DeliveryZoneInfo);
    });
  }

  goToStep2() {
    if (this.deliveryForm.valid && this.zoneInfo()?.available !== false) {
      this.currentStep.set(2);
    }
  }

  applyPromo() {
    if (!this.promoCode.trim()) return;
    this.api.validatePromoCode(this.promoCode, this.cart.subTotal()).subscribe(result => {
      this.promoResult.set(result);
      if (result.valid) this.discountAmount = result.discount ?? 0;
    });
  }

  placeOrder() {
    if (!this.deliveryForm.valid) return;
    this.placing.set(true);
    this.orderError.set('');

    const f = this.deliveryForm.value;
    const order = {
      customerName: `${f.firstName} ${f.lastName}`,
      customerEmail: f.email,
      customerPhone: f.phone,
      deliveryAddress: {
        recipientName: f.recipientName,
        recipientPhone: f.recipientPhone,
        line1: f.line1,
        line2: f.line2 || null,
        city: f.city,
        district: f.district,
        postalCode: null
      },
      items: this.cart.toOrderItems(),
      giftMessage: this.giftMessage || null,
      giftCardDesign: this.selectedCardDesign,
      includeGiftWrap: this.includeWrap,
      discountCode: this.promoResult()?.valid ? this.promoCode : null,
      requestedDeliveryDate: null,
      timeSlot: this.selectedSlot || null
    };

    this.api.createOrder(order).subscribe({
      next: result => {
        // Parse payment form data from response and submit to PayHere
        const paymentFormData = JSON.parse(result.payment.paymentId);
        this.paymentData = paymentFormData;
        this.payHereUrl = result.payment.paymentUrl;
        this.cart.clearCart();

        // Submit form to PayHere after DOM update
        setTimeout(() => {
          const form = document.getElementById('payhere-form') as HTMLFormElement;
          if (form) form.submit();
        }, 100);
      },
      error: err => {
        this.orderError.set(err.error?.message ?? 'Failed to place order. Please try again.');
        this.placing.set(false);
      }
    });
  }
}
