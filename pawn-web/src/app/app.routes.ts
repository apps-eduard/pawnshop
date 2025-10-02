import { Routes } from '@angular/router';

// Import all feature routes
import { transactionRoutes } from './features/transactions/routes/transaction.routes';
import { dashboardRoutes } from './features/dashboards/routes/dashboard.routes';
import { managementRoutes } from './features/management/routes/management.routes';
import { settingsRoutes } from './features/settings/routes/settings.routes';
import { pageRoutes } from './features/pages/routes/page.routes';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Page routes (login, error pages)
  {
    path: '',
    children: pageRoutes
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

  // Legacy redirects for management
  { path: 'address-management', redirectTo: 'management/address', pathMatch: 'full' },
  { path: 'item-management', redirectTo: 'management/item', pathMatch: 'full' },
  { path: 'pawner-management', redirectTo: 'management/pawner', pathMatch: 'full' },
  { path: 'user-management', redirectTo: 'management/user', pathMatch: 'full' },
  { path: 'admin-settings', redirectTo: 'settings/admin', pathMatch: 'full' },

  // Dashboard routes
  {
    path: 'dashboard',
    children: dashboardRoutes
  },

  // Legacy redirects (to maintain backward compatibility)
  { path: 'admin-dashboard', redirectTo: 'dashboard/admin', pathMatch: 'full' },
  { path: 'manager-dashboard', redirectTo: 'dashboard/manager', pathMatch: 'full' },
  { path: 'cashier-dashboard', redirectTo: 'dashboard/cashier', pathMatch: 'full' },
  { path: 'appraiser-dashboard', redirectTo: 'dashboard/appraiser', pathMatch: 'full' },
  { path: 'auctioneer-dashboard', redirectTo: 'dashboard/auctioneer', pathMatch: 'full' },
  { path: 'pawner-dashboard', redirectTo: 'dashboard/pawner', pathMatch: 'full' },

  // Transaction Routes
  {
    path: 'transactions',
    children: transactionRoutes
  },

  { path: '**', redirectTo: '/404' }
];
