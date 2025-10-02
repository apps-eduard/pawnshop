import { Routes } from '@angular/router';

// Settings Components
import { AdminSettingsComponent } from '../admin-settings/admin-settings';

export const settingsRoutes: Routes = [
  {
    path: 'admin',
    component: AdminSettingsComponent,
    // canActivate: [AuthGuard],
    data: { roles: ['administrator'] }
  }
];
