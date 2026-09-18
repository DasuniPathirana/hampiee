import { Routes } from '@angular/router';
import { adminGuard } from '../../projects/storefront/src/app/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard — Hampiee Admin'
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsAdminComponent),
        title: 'Products — Hampiee Admin'
      },
      {
        path: 'hampers',
        loadComponent: () => import('./pages/hampers/hampers.component').then(m => m.HampersAdminComponent),
        title: 'Hampers — Hampiee Admin'
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersAdminComponent),
        title: 'Orders — Hampiee Admin'
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersAdminComponent),
        title: 'Customers — Hampiee Admin'
      },
      {
        path: 'cms',
        loadComponent: () => import('./pages/cms/cms.component').then(m => m.CmsAdminComponent),
        title: 'Content — Hampiee Admin'
      },
      {
        path: 'delivery-zones',
        loadComponent: () => import('./pages/delivery-zones/delivery-zones.component').then(m => m.DeliveryZonesAdminComponent),
        title: 'Delivery Zones — Hampiee Admin'
      },
      {
        path: 'promotions',
        loadComponent: () => import('./pages/promotions/promotions.component').then(m => m.PromotionsAdminComponent),
        title: 'Promotions — Hampiee Admin'
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsAdminComponent),
        title: 'Analytics — Hampiee Admin'
      },
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/admin-login.component').then(m => m.AdminLoginComponent),
    title: 'Admin Login — Hampiee'
  }
];
