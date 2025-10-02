import { Routes } from '@angular/router';

// Transaction Components
import { Appraisal } from '../appraisal/appraisal';
import { NewLoan } from '../new-loan/new-loan';
import { AdditionalLoan } from '../additional-loan/additional-loan';
import { PartialPayment } from '../partial-payment/partial-payment';
import { Redeem } from '../redeem/redeem';
import { Renew } from '../renew/renew';

export const transactionRoutes: Routes = [
  {
    path: 'appraisal',
    component: Appraisal,
    // canActivate: [AuthGuard],
    data: { roles: ['appraiser', 'cashier', 'manager', 'administrator'] }
  },
  {
    path: 'new-loan',
    component: NewLoan,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'additional-loan',
    component: AdditionalLoan,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'partial-payment',
    component: PartialPayment,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'redeem',
    component: Redeem,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  },
  {
    path: 'renew',
    component: Renew,
    // canActivate: [AuthGuard],
    data: { roles: ['cashier', 'manager', 'administrator'] }
  }
];
