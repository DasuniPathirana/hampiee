import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Hampiee — Premium Sri Lankan Gifting'
  },
  {
    path: 'collections',
    loadComponent: () => import('./pages/collections/collections.component').then(m => m.CollectionsComponent),
    title: 'Gift Collections — Hampiee'
  },
  {
    path: 'collections/:slug',
    loadComponent: () => import('./pages/collections/collections.component').then(m => m.CollectionsComponent),
    title: 'Hampiee'
  },
  {
    path: 'products/:slug',
    loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
    title: 'Hampiee'
  },
  {
    path: 'hampers/:slug',
    loadComponent: () => import('./pages/hamper-detail/hamper-detail.component').then(m => m.HamperDetailComponent),
    title: 'Hampiee'
  },
  {
    path: 'builder',
    loadComponent: () => import('./pages/hamper-builder/hamper-builder.component').then(m => m.HamperBuilderComponent),
    title: 'Build Your Hamper — Hampiee'
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent),
    title: 'Your Cart — Hampiee'
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent),
    title: 'Checkout — Hampiee'
  },
  {
    path: 'checkout/success',
    loadComponent: () => import('./pages/checkout/success/order-success.component').then(m => m.OrderSuccessComponent)
  },
  {
    path: 'orders/:orderNumber',
    loadComponent: () => import('./pages/order-tracking/order-tracking.component').then(m => m.OrderTrackingComponent),
    title: 'Track Your Order — Hampiee'
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/account/account.routes').then(m => m.accountRoutes)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Sign In — Hampiee'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'Create Account — Hampiee'
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent),
    title: 'Our Story — Hampiee'
  },
  { path: '**', redirectTo: '' }
];
