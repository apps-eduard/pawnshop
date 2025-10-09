import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth/auth';
import { User } from '../../core/models/interfaces';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  // Navigation items for different roles
  navigationItems: NavigationItem[] = [
    // Dashboard items
    { label: 'Dashboard', route: '/dashboard/admin', icon: '📊', roles: ['admin', 'administrator'] },
    { label: 'Dashboard', route: '/dashboard/manager', icon: '📊', roles: ['manager'] },
    { label: 'Dashboard', route: '/dashboard/cashier', icon: '📊', roles: ['cashier'] },
    { label: 'Dashboard', route: '/dashboard/appraiser', icon: '📊', roles: ['appraiser'] },
    { label: 'Dashboard', route: '/dashboard/auctioneer', icon: '📊', roles: ['auctioneer'] },
    { label: 'Dashboard', route: '/dashboard/pawner', icon: '📊', roles: ['pawner'] },

    // Transactions
    { label: 'Transactions', route: '/transactions', icon: '💳', roles: ['admin', 'administrator', 'manager', 'cashier'] },

    // Users & Staff Management
    { label: 'User Management', route: '/user-management', icon: '👥', roles: ['admin', 'administrator'] },
    { label: 'Address Management', route: '/address-management', icon: '🏠', roles: ['admin', 'administrator'] },
    { label: 'Staff', route: '/staff', icon: '👨‍💼', roles: ['manager'] },

    // Customer Management
    { label: 'Pawner Management', route: '/pawner-management', icon: '🧑‍🤝‍🧑', roles: ['admin', 'administrator', 'manager', 'cashier'] },
    { label: 'Customers', route: '/customers', icon: '👤', roles: ['cashier'] },

    // Loans & Pawning
    { label: 'Loans', route: '/loans', icon: '🏦', roles: ['cashier', 'manager'] },
    { label: 'My Loans', route: '/my-loans', icon: '🏦', roles: ['pawner'] },
    { label: 'Make Payment', route: '/payments', icon: '💳', roles: ['pawner'] },
    { label: 'Loan History', route: '/loan-history', icon: '📋', roles: ['pawner'] },

    // Appraisals
    { label: 'Appraisals', route: '/appraisals', icon: '💎', roles: ['appraiser'] },

    // Items Management
    { label: 'Item Management', route: '/item-management', icon: '📦', roles: ['admin', 'administrator', 'manager'] },

    // Auctions
    { label: 'Auctions', route: '/auctions', icon: '🔨', roles: ['auctioneer', 'manager'] },
    { label: 'Bidders', route: '/bidders', icon: '🙋', roles: ['auctioneer'] },

    // Reports
    { label: 'Reports', route: '/reports', icon: '📈', roles: ['admin', 'administrator', 'manager', 'appraiser'] },

    // Vouchers (Manager only)
    { label: 'Vouchers', route: '/vouchers', icon: '🎟️', roles: ['manager', 'admin', 'administrator'] },

    // Settings (Admin only)
    { label: 'Settings', route: '/admin-settings', icon: '⚙️', roles: ['admin', 'administrator'] },
  ];

  // Quick action items
  quickActions = [
    { label: 'New User', action: 'newUser', icon: '➕', roles: ['admin', 'administrator'] },
    { label: 'New Loan', action: 'newLoan', icon: '🏦', roles: ['cashier'] },
    { label: 'New Appraisal', action: 'newAppraisal', icon: '💎', roles: ['appraiser'] },
    { label: 'New Auction', action: 'newAuction', icon: '🔨', roles: ['auctioneer'] },
    { label: 'Generate Report', action: 'generateReport', icon: '📄', roles: ['admin', 'administrator', 'manager'] },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        // console.log('Sidebar received user update:', user);
      });

    // For testing - simulate admin user if none exists
    if (!this.currentUser) {
      // console.log('No user found - creating test admin user');
      this.currentUser = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'administrator',
        isActive: true
      };
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Filter navigation items based on user role
  getFilteredNavigation(): NavigationItem[] {
    // Debug logging
    // console.log('Current user in sidebar:', this.currentUser);

    // For testing purposes, if no user is logged in, show admin items
    if (!this.currentUser) {
      // console.log('No current user - showing admin navigation for testing');
      return this.navigationItems.filter(item => item.roles.includes('administrator'));
    }

    // console.log('Filtering navigation for role:', this.currentUser.role);
    const filteredItems = this.navigationItems.filter(item =>
      item.roles.includes(this.currentUser!.role)
    );
    // console.log('Filtered navigation items:', filteredItems);

    return filteredItems;
  }

  // Filter quick actions based on user role
  getFilteredQuickActions() {
    if (!this.currentUser) return [];

    return this.quickActions.filter(action =>
      action.roles.includes(this.currentUser!.role)
    );
  }

  // Handle navigation
  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeSidebar.emit();
  }

  // Handle quick actions
  handleQuickAction(action: string): void {
    switch (action) {
      case 'newUser':
        this.router.navigate(['/user-management']);
        break;
      case 'newLoan':
        this.router.navigate(['/loans/new']);
        break;
      case 'newAppraisal':
        this.router.navigate(['/appraisals/new']);
        break;
      case 'newAuction':
        this.router.navigate(['/auctions/new']);
        break;
      case 'generateReport':
        this.router.navigate(['/reports/generate']);
        break;
    }
    this.closeSidebar.emit();
  }

  // Close sidebar when clicking outside (mobile)
  onBackdropClick(): void {
    this.closeSidebar.emit();
  }

  // Get current date for display
  getCurrentDate(): Date {
    return new Date();
  }
}
