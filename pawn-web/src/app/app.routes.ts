import { Routes } from '@angular/router';

// Import all feature routes
import { transactionRoutes } from './features/transactions/routes/transaction.routes';
import { dashboardRoutes } from './features/dashboards/routes/dashboard.routes';
import { managementRoutes } from './features/management/routes/management.routes';
import { settingsRoutes } from './features/settings/routes/settings.routes';
// Import auth component
import { LoginComponent } from './auth/login/login';
// Import layout component
import { LayoutComponent } from './shared/layout/layout';
// Import vouchers component
import { VouchersComponent } from './features/vouchers/vouchers';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Login route
  {
    path: 'login',
    component: LoginComponent
  },

  // Authenticated routes with layout
  {
    path: '',
    component: LayoutComponent,
    children: [
      // Dashboard routes
      {
        path: 'dashboard',
        children: dashboardRoutes
      },

      // Management routes
      {
        path: 'management',
        children: managementRoutes
      },

      // Settings routes
      {
        path: 'settings',
        children: settingsRoutes
      },

      // Transaction Routes
      {
        path: 'transactions',
        children: transactionRoutes
      },

      // Vouchers Route
      {
        path: 'vouchers',
        component: VouchersComponent
      },

      // Legacy redirects for management
      { path: 'address-management', redirectTo: 'management/address', pathMatch: 'full' },
      { path: 'item-management', redirectTo: 'management/item', pathMatch: 'full' },
      { path: 'pawner-management', redirectTo: 'management/pawner', pathMatch: 'full' },
      { path: 'user-management', redirectTo: 'management/user', pathMatch: 'full' },
      { path: 'admin-settings', redirectTo: 'settings/admin', pathMatch: 'full' },

      // Legacy redirects (to maintain backward compatibility)
      { path: 'admin-dashboard', redirectTo: 'dashboard/admin', pathMatch: 'full' },
      { path: 'manager-dashboard', redirectTo: 'dashboard/manager', pathMatch: 'full' },
      { path: 'cashier-dashboard', redirectTo: 'dashboard/cashier', pathMatch: 'full' },
      { path: 'appraiser-dashboard', redirectTo: 'dashboard/appraiser', pathMatch: 'full' },
      { path: 'auctioneer-dashboard', redirectTo: 'dashboard/auctioneer', pathMatch: 'full' },
      { path: 'pawner-dashboard', redirectTo: 'dashboard/pawner', pathMatch: 'full' },
    ]
  },

  // Error routes
  { path: '404', component: LoginComponent, data: { error: '404' } },
  { path: '403', component: LoginComponent, data: { error: '403' } },
  { path: '500', component: LoginComponent, data: { error: '500' } },

  { path: '**', redirectTo: '/login' }
];
