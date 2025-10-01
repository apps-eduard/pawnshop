import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { AdminSettingsComponent } from './pages/admin-settings/admin-settings';
import { UserManagementComponent } from './pages/user-management/user-management';
import { AddressManagementComponent } from './pages/address-management/address-management';
import { PawnerManagementComponent } from './pages/pawner-management/pawner-management';
import { ItemManagementComponent } from './pages/item-management/item-management';
import { CashierDashboard } from './pages/cashier-dashboard/cashier-dashboard';
import { AppraiserDashboard } from './pages/appraiser-dashboard/appraiser-dashboard';
import { ManagerDashboard } from './pages/manager-dashboard/manager-dashboard';
import { AuctioneerDashboard } from './pages/auctioneer-dashboard/auctioneer-dashboard';
import { PawnerDashboard } from './pages/pawner-dashboard/pawner-dashboard';

// Transaction Components
import { Appraisal } from './features/transactions/appraisal/appraisal';
import { NewLoan } from './features/transactions/new-loan/new-loan';
import { AdditionalLoan } from './features/transactions/additional-loan/additional-loan';
import { PartialPayment } from './features/transactions/partial-payment/partial-payment';
import { Redeem } from './features/transactions/redeem/redeem';
import { Renew } from './features/transactions/renew/renew';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin-dashboard',
    component: AdminDashboard,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['administrator'] }
  },
  {
    path: 'admin-settings',
    component: AdminSettingsComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['administrator'] }
  },
  {
    path: 'user-management',
    component: UserManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['administrator'] }
  },
  {
    path: 'address-management',
    component: AddressManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['administrator'] }
  },
  {
    path: 'pawner-management',
    component: PawnerManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['administrator', 'manager', 'cashier'] }
  },
  {
    path: 'item-management',
    component: ItemManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['administrator', 'manager'] }
  },
  {
    path: 'manager-dashboard',
    component: ManagerDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['manager'] }
  },

  {
    path: 'cashier-dashboard',
    component: CashierDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier'] }
  },

  {
    path: 'appraiser-dashboard',
    component: AppraiserDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['appraiser'] }
  },
  {
    path: 'auctioneer-dashboard',
    component: AuctioneerDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['auctioneer'] }
  },
  {
    path: 'pawner-dashboard',
    component: PawnerDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['pawner'] }
  },

  // Transaction Routes
  {
    path: 'transactions/appraisal',
    component: Appraisal,
    // canActivate: [AuthGuard],
    data: { roles: ['appraiser', 'cashier', 'manager', 'administrator'] }
  },
  {
    path: 'transactions/new-loan',
    component: NewLoan,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'transactions/additional-loan',
    component: AdditionalLoan,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'transactions/partial-payment',
    component: PartialPayment,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'transactions/redeem',
    component: Redeem,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'transactions/renew',
    component: Renew,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },

  { path: '**', redirectTo: '/login' }
];
