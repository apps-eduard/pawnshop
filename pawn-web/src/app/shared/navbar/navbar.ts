import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth';
import { ThemeService } from '../../core/theme/theme';
import { User } from '../../core/models/interfaces';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ClickOutsideDirective],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() sidebarOpen = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeSidebar = new EventEmitter<void>();

  currentUser: User | null = null;
  isDarkMode = false;
  userMenuOpen = false;
  roleMenuOpen = false;
  isOnLoginPage = false;
  isOnTransactionPage = false;
  currentDateTime = new Date();
  currentPageTitle = '';
  currentBranchName = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router,
    private location: Location,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadCurrentBranch();
        }
      });

    // Subscribe to theme changes
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDark => {
        this.isDarkMode = isDark;
      });

    // Track current route to hide login button on login page
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.isOnLoginPage = event.url === '/login' || event.url.startsWith('/login');
        this.isOnTransactionPage = event.url.includes('/transactions/');
        this.setPageTitle(event.url);
      });

    // Set initial state
    this.isOnLoginPage = this.router.url === '/login' || this.router.url.startsWith('/login');
    this.isOnTransactionPage = this.router.url.includes('/transactions/');

    // Set initial page title based on current URL
    this.setPageTitle(this.router.url);

    // Update current time every minute
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 60000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
    this.userMenuOpen = false;
    this.onCloseSidebar();
    this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const firstInitial = this.currentUser.firstName?.charAt(0) || '';
    const lastInitial = this.currentUser.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  hasMultipleRoles(): boolean {
    return this.authService.hasMultipleRoles();
  }

  getAvailableRoles(): string[] {
    return this.authService.getAvailableRoles() as string[];
  }

  switchRole(newRole: string): void {
    this.authService.switchRole(newRole);
    this.roleMenuOpen = false;
    this.userMenuOpen = false;
    
    // Navigate to the new role's dashboard
    const dashboardRoute = this.authService.getDashboardRoute();
    this.router.navigate([dashboardRoute]);
    
    // Update page title
    this.setPageTitle(dashboardRoute);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onCloseSidebar(): void {
    this.closeSidebar.emit();
  }

  getDashboardRoute(): string {
    return this.authService.getDashboardRoute();
  }

  // Close menus when clicking outside
  onClickOutside(): void {
    this.userMenuOpen = false;
  }

  // Close dropdown menu
  closeDropdown(): void {
    this.userMenuOpen = false;
  }

  // Go back navigation
  goBack(): void {
    this.location.back();
  }

  // Set page title based on URL
  private setPageTitle(url: string): void {
    // Dashboard pages
    if (url.includes('/dashboard/admin') || url.includes('/admin-dashboard')) {
      this.currentPageTitle = 'Admin Dashboard';
    } else if (url.includes('/dashboard/manager') || url.includes('/manager-dashboard')) {
      this.currentPageTitle = 'Manager Dashboard';
    } else if (url.includes('/dashboard/cashier') || url.includes('/cashier-dashboard')) {
      this.currentPageTitle = 'Cashier Dashboard';
    } else if (url.includes('/dashboard/appraiser') || url.includes('/appraiser-dashboard')) {
      this.currentPageTitle = 'Appraiser Dashboard';
    } else if (url.includes('/dashboard/auctioneer') || url.includes('/auctioneer-dashboard')) {
      this.currentPageTitle = 'Auctioneer Dashboard';
    } else if (url.includes('/dashboard/pawner') || url.includes('/pawner-dashboard')) {
      this.currentPageTitle = 'Pawner Dashboard';
    }
    // Settings pages
    else if (url.includes('/settings/admin') || url.includes('/admin-settings')) {
      this.currentPageTitle = 'Admin Settings';
    } else if (url.includes('/settings/')) {
      this.currentPageTitle = 'Settings';
    }
    // Management pages
    else if (url.includes('/management/pawner') || url.includes('/pawner-management')) {
      this.currentPageTitle = 'Pawner Management';
    } else if (url.includes('/management/item') || url.includes('/item-management')) {
      this.currentPageTitle = 'Item Management';
    } else if (url.includes('/management/user') || url.includes('/user-management')) {
      this.currentPageTitle = 'User Management';
    } else if (url.includes('/management/address') || url.includes('/address-management')) {
      this.currentPageTitle = 'Address Management';
    } else if (url.includes('/management/')) {
      this.currentPageTitle = 'Management';
    }
    // Transaction pages
    else if (url.includes('/transactions/appraisal')) {
      this.currentPageTitle = 'Create Appraisal';
    } else if (url.includes('/transactions/redeem')) {
      this.currentPageTitle = 'Redeem Transaction';
    } else if (url.includes('/transactions/new-loan')) {
      this.currentPageTitle = 'New Loan';
    } else if (url.includes('/transactions/additional-loan')) {
      this.currentPageTitle = 'Additional Loan';
    } else if (url.includes('/transactions/partial-payment')) {
      this.currentPageTitle = 'Partial Payment';
    } else if (url.includes('/transactions/renew')) {
      this.currentPageTitle = 'Renew Transaction';
    } else if (url.includes('/transactions')) {
      this.currentPageTitle = 'Transaction Management';
    }
    // RBAC page
    else if (url.includes('/rbac')) {
      this.currentPageTitle = 'User & Role Management';
    }
    // Reports page
    else if (url.includes('/reports')) {
      this.currentPageTitle = 'Reports';
    }
    // Default - no title
    else {
      this.currentPageTitle = '';
    }
  }

  // Load current branch information
  private loadCurrentBranch(): void {
    this.http.get<{success: boolean, data: any}>('http://localhost:3000/api/branch-config/current').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentBranchName = response.data.name;
        }
      },
      error: (error) => {
        console.error('Error loading current branch:', error);
        this.currentBranchName = '';
      }
    });
  }
}
