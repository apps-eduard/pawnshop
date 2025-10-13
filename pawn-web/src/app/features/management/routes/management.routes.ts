import { Routes } from '@angular/router';

// Management Components
import { AddressManagementComponent } from '../address-management/address-management';
import { ItemManagementComponent } from '../item-management/item-management';
import { PawnerManagementComponent } from '../pawner-management/pawner-management';
import { UserManagementComponent } from '../user-management/user-management';
import { VoucherManagementComponent } from '../voucher-management/voucher-management';

export const managementRoutes: Routes = [
  {
    path: 'address',
    component: AddressManagementComponent,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator'] }
  },
  {
    path: 'item',
    component: ItemManagementComponent,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator', 'manager'] }
  },
  {
    path: 'pawner',
    component: PawnerManagementComponent,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator', 'manager', 'cashier'] }
  },
  {
    path: 'user',
    component: UserManagementComponent,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator'] }
  },
  {
    path: 'vouchers',
    component: VoucherManagementComponent,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator', 'manager', 'cashier'] }
  }
];
