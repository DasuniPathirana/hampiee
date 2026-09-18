import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  primaryImageUrl?: string;
  images?: { url: string; altText: string; displayOrder: number }[];
  tags?: string[];
  categoryId?: string;
  hasStock: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  discountPercentage?: number;
  brand?: string;
  sku?: string;
  weightGrams?: number;
  createdAt?: string;
}

export interface Hamper {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  heroImageUrl?: string;
  images?: { url: string; altText: string }[];
  isCustomizable: boolean;
  isFeatured: boolean;
  categoryId?: string;
  items?: HamperItem[];
}

export interface HamperItem {
  productId: string;
  product?: Product;
  quantity: number;
  isSwappable: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  occasionTag?: string;
  parentId?: string;
  children?: Category[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  districts: string[];
  basePrice: number;
  freeDeliveryThreshold?: number;
  estimatedDelivery: string;
  isSameDay: boolean;
  slots?: { id: string; label: string; startTime: string; endTime: string }[];
}

export interface CmsBlock {
  key: string;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  linkText?: string;
  backgroundColor?: string;
  textColor?: string;
  displayOrder: number;
  metaJson?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Products ────────────────────────────────────────────────────────────────
  getProducts(params: {
    q?: string; categoryId?: string; minPrice?: number; maxPrice?: number;
    inStock?: boolean; page?: number; pageSize?: number; sortBy?: string;
  } = {}): Observable<PagedResult<Product>> {
    let hp = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) hp = hp.set(k, String(v)); });
    return this.http.get<PagedResult<Product>>(`${this.base}/products`, { params: hp });
  }

  getProduct(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/${slug}`);
  }

  getFeaturedProducts(count = 8): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products/featured`, { params: { count } });
  }

  // ── Hampers ─────────────────────────────────────────────────────────────────
  getHampers(params: { categoryId?: string; page?: number; pageSize?: number } = {}): Observable<PagedResult<Hamper>> {
    let hp = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) hp = hp.set(k, String(v)); });
    return this.http.get<PagedResult<Hamper>>(`${this.base}/hampers`, { params: hp });
  }

  getHamper(slug: string): Observable<Hamper> {
    return this.http.get<Hamper>(`${this.base}/hampers/${slug}`);
  }

  getFeaturedHampers(count = 8): Observable<Hamper[]> {
    return this.http.get<Hamper[]>(`${this.base}/hampers/featured`, { params: { count } });
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  // ── CMS ─────────────────────────────────────────────────────────────────────
  getCmsBlocks(keys: string[]): Observable<CmsBlock[]> {
    return this.http.get<CmsBlock[]>(`${this.base}/cms`, { params: { keys } });
  }

  // ── Delivery ────────────────────────────────────────────────────────────────
  getDeliveryZones(): Observable<DeliveryZone[]> {
    return this.http.get<DeliveryZone[]>(`${this.base}/delivery-zones`);
  }

  checkDelivery(district: string, orderTotal?: number): Observable<{
    available: boolean; zoneId?: string; deliveryFee?: number;
    freeDeliveryThreshold?: number; estimatedDelivery?: string; isSameDay?: boolean;
    slots?: DeliveryZone['slots'];
  }> {
    let params = new HttpParams().set('district', district);
    if (orderTotal) params = params.set('orderTotal', orderTotal);
    return this.http.get<any>(`${this.base}/delivery-zones/check`, { params });
  }

  // ── Promotions ──────────────────────────────────────────────────────────────
  validatePromoCode(code: string, orderTotal: number): Observable<{
    valid: boolean; discount?: number; description?: string; discountType?: string; message?: string;
  }> {
    return this.http.post<any>(`${this.base}/promotions/validate`, { code, orderTotal });
  }

  // ── Orders ──────────────────────────────────────────────────────────────────
  createOrder(order: any): Observable<{
    orderId: string; orderNumber: string; payment: any;
  }> {
    return this.http.post<any>(`${this.base}/orders`, order);
  }

  getOrder(orderNumber: string): Observable<any> {
    return this.http.get<any>(`${this.base}/orders/${orderNumber}`);
  }
}
