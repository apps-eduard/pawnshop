import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth/auth';
import { VoucherService } from '../../core/services/voucher.service';
import { RbacV2Service, MenuItem } from '../../core/services/rbac-v2.service';
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
  transactionType: 'cash_in' | 'cash_out';
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

  // 🆕 Dynamic menu support
  dynamicMenuItems: MenuItem[] = [];
  useDynamicMenus = false;
  isLoadingMenus = false;

  // Cache navigation items to prevent infinite loops
  cachedNavigationItems: NavigationItem[] = [];

  // Static navigation items - REMOVED (now using database menus only)
  // Keep minimal fallback for emergency access
  navigationItems: NavigationItem[] = [];

  // Voucher modal state
  showVoucherModal = false;
  voucherForm: VoucherForm = {
    type: 'cash',
    transactionType: 'cash_out',
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
    private voucherService: VoucherService,
    private rbacService: RbacV2Service,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async user => {
        this.currentUser = user;
        if (user && !this.isLoadingMenus) {
          await this.loadDynamicMenus(user.id);
        }
      });

    // For testing - simulate admin user if none exists
    if (!this.currentUser) {
      this.currentUser = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'administrator',
        isActive: true
      };
      if (!this.useDynamicMenus && !this.isLoadingMenus) {
        await this.loadDynamicMenus(1);
      }
    }
  }

  async loadDynamicMenus(userId: number): Promise<void> {
    this.isLoadingMenus = true;
    try {
      const menus = await this.rbacService.getMenusByUser(userId).toPromise();
      if (menus && Array.isArray(menus)) {
        this.dynamicMenuItems = menus;
        // ✅ Use dynamic menus from database (re-enabled)
        this.useDynamicMenus = true;
        console.log('✅ Loaded dynamic menus for user:', userId, `(${menus.length})`);
        // Update cached navigation
        this.updateNavigationCache();
      } else {
        throw new Error('Invalid menu response');
      }
    } catch (error) {
      console.error('❌ Failed to load dynamic menus, using static:', error);
      this.useDynamicMenus = false;
      this.dynamicMenuItems = [];
      this.updateNavigationCache();
    } finally {
      this.isLoadingMenus = false;
    }
  }

  updateNavigationCache(): void {
    if (this.useDynamicMenus && this.dynamicMenuItems && this.dynamicMenuItems.length > 0) {
      const dynamicItems = this.getDynamicNavigation();
      this.cachedNavigationItems = dynamicItems.map(menu => this.convertToNavigationItem(menu));
    } else {
      this.cachedNavigationItems = this.getFilteredNavigation();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDynamicNavigation(): MenuItem[] {
    // Show all items without filtering for now
    return this.dynamicMenuItems.sort((a, b) => a.order_index - b.order_index);
  }

  convertToNavigationItem(menu: MenuItem): NavigationItem {
    let route = menu.route;

    // 🔧 FIX: Convert generic /dashboard to role-specific dashboard routes
    if (route === '/dashboard' && this.currentUser?.role) {
      const role = this.currentUser.role.toLowerCase();
      route = `/dashboard/${role}`;
      console.log(`🔄 Converted dashboard route for ${role}: ${route}`);
    }

    return {
      label: menu.name,
      route: route,
      icon: menu.icon,
      roles: []
    };
  }

  getNavigation(): NavigationItem[] {
    try {
      if (this.useDynamicMenus && this.dynamicMenuItems && this.dynamicMenuItems.length > 0) {
        const dynamicItems = this.getDynamicNavigation();
        return dynamicItems.map(menu => this.convertToNavigationItem(menu));
      }
      return this.getFilteredNavigation();
    } catch (error) {
      console.error('❌ Error in getNavigation:', error);
      return [];
    }
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

  // Handle navigation
  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeSidebar.emit();
  }

  // Handle menu click with event for proper control
  handleMenuClick(event: Event, route: string): void {
    // Just close the sidebar - routerLink will handle navigation
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

    // Focus on amount input after modal opens and select text
    setTimeout(() => {
      const amountInput = document.getElementById('voucherAmount') as HTMLInputElement;
      if (amountInput) {
        amountInput.focus();
        amountInput.select();
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
      transactionType: 'cash_out',
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

    // Store current date and type
    const currentDate = this.voucherForm.date;
    const currentType = this.voucherForm.type;

    // Reset form completely
    this.resetVoucherForm();

    // Restore date and type only
    this.voucherForm.date = currentDate;
    this.voucherForm.type = currentType;

    // Focus back to amount input and clear it
    setTimeout(() => {
      const amountInput = document.getElementById('voucherAmount') as HTMLInputElement;
      if (amountInput) {
        // Clear the input value directly
        amountInput.value = '';
        // Trigger input event to update ngModel
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        // Focus on the input
        amountInput.focus();
      }
    }, 50);
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
      transactionType: v.transactionType,
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
          this.showErrorToast(`Failed to save vouchers: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error saving vouchers:', error);
        const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        const statusCode = error.status;

        if (statusCode === 403) {
          this.showErrorToast('Access denied: You do not have permission to save vouchers');
        } else if (statusCode === 500) {
          this.showErrorToast('Server error: Failed to save vouchers. Please try again later.');
        } else {
          this.showErrorToast(`Failed to save vouchers: ${errorMessage}`);
        }
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

  showErrorToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 5000); // Show error messages longer (5 seconds)
  }

  getTotalAmount(): number {
    return this.voucherList.reduce((sum, v) => sum + v.amount, 0);
  }
}
