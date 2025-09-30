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

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin-dashboard',
    component: AdminDashboard,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['admin'] }
  },
  {
    path: 'admin-settings',
    component: AdminSettingsComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['admin'] }
  },
  {
    path: 'user-management',
    component: UserManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['admin'] }
  },
  {
    path: 'address-management',
    component: AddressManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['admin'] }
  },
  {
    path: 'pawner-management',
    component: PawnerManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['admin', 'manager', 'cashier'] }
  },
  {
    path: 'item-management',
    component: ItemManagementComponent,
    // canActivate: [AuthGuard], // TODO: Implement auth guard
    data: { roles: ['admin', 'manager'] }
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
  { path: '**', redirectTo: '/login' }
];
