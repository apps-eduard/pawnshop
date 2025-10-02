import { Routes } from '@angular/router';

// Page Components
import { LoginComponent } from '../login/login';
import { ErrorComponent } from '../error/error';

export const pageRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'error',
    component: ErrorComponent
  },
  {
    path: '404',
    component: ErrorComponent,
    data: {
      errorCode: '404',
      errorTitle: 'Page Not Found',
      errorMessage: 'The page you are looking for does not exist or has been moved.'
    }
  },
  {
    path: '403',
    component: ErrorComponent,
    data: {
      errorCode: '403',
      errorTitle: 'Access Denied',
      errorMessage: 'You do not have permission to access this page.'
    }
  },
  {
    path: '500',
    component: ErrorComponent,
    data: {
      errorCode: '500',
      errorTitle: 'Server Error',
      errorMessage: 'Something went wrong on our end. Please try again later.'
    }
  }
];
