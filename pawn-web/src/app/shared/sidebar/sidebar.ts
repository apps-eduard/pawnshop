import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth/auth';
import { VoucherService } from '../../core/services/voucher.service';
import { User } from '../../core/models/interfaces';
import { CurrencyInputDirective } from '../directives/currency-input.directive';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

interface VoucherForm {
  type: 'cash' | 'cheque';
  date: string;
  amount: number;
  notes: string;
}

interface VoucherEntry extends VoucherForm {
  id: number;
  createdAt: Date;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyInputDirective],
  providers: [VoucherService],
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
    { label: 'Voucher', action: 'voucher', icon: '🎟️', roles: ['admin', 'administrator', 'manager'] },
    { label: 'Generate Report', action: 'generateReport', icon: '📄', roles: ['admin', 'administrator', 'manager'] },
  ];

  // Voucher modal state
  showVoucherModal = false;
  voucherForm: VoucherForm = {
    type: 'cash',
    date: '',
    amount: 0,
    notes: ''
  };
  voucherList: VoucherEntry[] = [];
  showToast = false;
  toastMessage = '';
  nextVoucherId = 1;

  constructor(
    private authService: AuthService,
    private router: Router,
    private voucherService: VoucherService
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
      case 'voucher':
        this.openVoucherModal();
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

  // Voucher modal methods
  openVoucherModal(): void {
    this.showVoucherModal = true;
    const today = new Date().toISOString().split('T')[0];
    this.voucherForm.date = today;
    
    // Focus on date input after modal opens
    setTimeout(() => {
      const dateInput = document.querySelector('input[name="voucherDate"]') as HTMLInputElement;
      if (dateInput) {
        dateInput.focus();
      }
    }, 100);
  }

  closeVoucherModal(): void {
    this.showVoucherModal = false;
    this.resetVoucherForm();
    this.voucherList = [];
    this.nextVoucherId = 1;
  }

  resetVoucherForm(): void {
    this.voucherForm = {
      type: 'cash',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      notes: ''
    };
  }

  addVoucher(): void {
    if (!this.validateVoucherForm()) {
      return;
    }

    // Add voucher to list
    const newVoucher: VoucherEntry = {
      id: this.nextVoucherId++,
      ...this.voucherForm,
      createdAt: new Date()
    };

    this.voucherList.unshift(newVoucher);

    // Show toast notification
    this.showSuccessToast(`Voucher added: ${this.voucherForm.type.toUpperCase()} - ₱${this.voucherForm.amount.toLocaleString()}`);

    // Reset form but keep date
    const currentDate = this.voucherForm.date;
    this.resetVoucherForm();
    this.voucherForm.date = currentDate;

    // Focus back to date input
    setTimeout(() => {
      const dateInput = document.querySelector('input[name="voucherDate"]') as HTMLInputElement;
      if (dateInput) {
        dateInput.focus();
      }
    }, 100);
  }

  removeVoucher(id: number): void {
    this.voucherList = this.voucherList.filter(v => v.id !== id);
    this.showSuccessToast('Voucher removed from list');
  }

  saveAllVouchers(): void {
    if (this.voucherList.length === 0) {
      alert('No vouchers to save');
      return;
    }

    // Convert VoucherEntry[] to VoucherForm[] for API
    const vouchersToSave = this.voucherList.map(v => ({
      type: v.type,
      date: v.date,
      amount: v.amount,
      notes: v.notes
    }));

    // Call API to save vouchers in batch
    this.voucherService.createVouchersBatch(vouchersToSave).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessToast(`Successfully saved ${this.voucherList.length} voucher(s)!`);
          this.voucherList = [];
          this.nextVoucherId = 1;
          this.closeVoucherModal();
        } else {
          alert(`Failed to save vouchers: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error saving vouchers:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        alert(`Failed to save vouchers: ${errorMessage}`);
      }
    });
  }

  validateVoucherForm(): boolean {
    if (!this.voucherForm.date) {
      alert('Date is required');
      return false;
    }

    if (this.voucherForm.amount <= 0) {
      alert('Amount must be greater than 0');
      return false;
    }

    if (!this.voucherForm.notes.trim()) {
      alert('Notes are required');
      return false;
    }

    return true;
  }

  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 2000);
  }

  getTotalAmount(): number {
    return this.voucherList.reduce((sum, v) => sum + v.amount, 0);
  }
}
