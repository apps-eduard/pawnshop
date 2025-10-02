import { Routes } from '@angular/router';

// Dashboard Components
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';
import { ManagerDashboard } from '../manager-dashboard/manager-dashboard';
import { CashierDashboard } from '../cashier-dashboard/cashier-dashboard';
import { AppraiserDashboard } from '../appraiser-dashboard/appraiser-dashboard';
import { AuctioneerDashboard } from '../auctioneer-dashboard/auctioneer-dashboard';
import { PawnerDashboard } from '../pawner-dashboard/pawner-dashboard';

export const dashboardRoutes: Routes = [
  {
    path: 'admin',
    component: AdminDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator'] }
  },
  {
    path: 'manager',
    component: ManagerDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['manager'] }
  },
  {
    path: 'cashier',
    component: CashierDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier'] }
  },
  {
    path: 'appraiser',
    component: AppraiserDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['appraiser'] }
  },
  {
    path: 'auctioneer',
    component: AuctioneerDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['auctioneer'] }
  },
  {
    path: 'pawner',
    component: PawnerDashboard,
    // canActivate: [AuthGuard],
    data: { roles: ['pawner'] }
  }
];
