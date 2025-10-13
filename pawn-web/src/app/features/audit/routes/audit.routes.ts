import { Routes } from '@angular/router';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../audit-viewer/audit-viewer.component').then(m => m.AuditViewerComponent)
  }
];
