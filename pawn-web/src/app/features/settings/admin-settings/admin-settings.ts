import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';

interface Category {
  id?: number;
  name: string;
  description: string;
  interest_rate: number;
  is_active: boolean;
}

interface Branch {
  id?: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  manager_name?: string;
  is_active: boolean;
}



interface VoucherType {
  id?: number;
  code: string;
  type: 'CASH' | 'CHEQUE';
  description: string;
  is_active: boolean;
}

interface AuditLogEntry {
  id: number;
  username: string;
  action: string;
  table_name: string;
  record_id: number;
  old_values: any;
  new_values: any;
  created_at: string;
}

interface PenaltyConfig {
  id: number;
  config_key: string;
  config_value: number;
  description: string;
  is_active: boolean;
}

interface ServiceChargeBracket {
  id: number;
  bracket_name: string;
  min_amount: number;
  max_amount: number | null;
  service_charge: number;
  display_order: number;
  is_active: boolean;
}

interface ServiceChargeConfig {
  config: PenaltyConfig[];
  brackets: ServiceChargeBracket[];
}

interface SystemStats {
  categories: { total: number; active: number; inactive: number };
  branches: { total: number; active: number; inactive: number };
  voucher_types: { total: number; active: number; inactive: number };
  recent_changes: number;
}

interface TransactionConfig {
  prefix: string;
  includeYear: boolean;
  includeMonth: boolean;
  includeDay: boolean;
  sequenceDigits: number;
  separator: string;
}

interface BranchConfig {
  config: {
    current_branch_id: string;
    installation_type: string;
    sync_enabled: string;
    last_sync_timestamp: string;
  } | null;
  currentBranch: {
    id: number;
    name: string;
    code: string;
    address: string;
    contact_number?: string;
    installation_type?: string;
    sync_enabled?: string;
  } | null;
  availableBranches: {
    id: number;
    name: string;
    code: string;
    address: string;
    is_active: boolean;
  }[];
}



type TabKey = 'categories' | 'branches' | 'vouchers' | 'loan-rules' | 'audit' | 'stats' | 'system-config';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css'
})
export class AdminSettingsComponent implements OnInit {
  activeTab: string = 'system-config';
  isLoading = false;

    // Tab definitions
  tabs: {key: string, label: string, icon: string}[] = [
    {key: 'system-config', label: 'System Configuration', icon: 'settings'},
    {key: 'categories', label: 'Categories & Interest', icon: 'tag'},
    {key: 'branches', label: 'Branches', icon: 'office'},
    {key: 'vouchers', label: 'Voucher Types', icon: 'receipt'},
    {key: 'penalty-config', label: 'Penalty Settings', icon: 'exclamation-triangle'},
    {key: 'service-charge-config', label: 'Service Charge Settings', icon: 'currency-dollar'},
    {key: 'audit', label: 'Audit Trail', icon: 'clipboard'},
    {key: 'stats', label: 'Statistics', icon: 'chart'}
  ];

  // Data arrays
  categories: Category[] = [];
  branches: Branch[] = [];
  voucherTypes: VoucherType[] = [];
  branchConfig: BranchConfig | null = null;
  transactionConfig: TransactionConfig = {
    prefix: 'TXN',
    includeYear: true,
    includeMonth: true,
    includeDay: true,
    sequenceDigits: 2,
    separator: '-'
  };

  // Penalty and Service Charge Configuration
  penaltyConfig: PenaltyConfig[] = [];
  serviceChargeConfig: ServiceChargeConfig = {
    config: [],
    brackets: []
  };
  editingServiceChargeBracket: ServiceChargeBracket | null = null;

  // Make Math available in template
  Math = Math;

  // Forms
  categoryForm!: FormGroup;
  branchForm!: FormGroup;
  voucherForm!: FormGroup;
  branchConfigForm!: FormGroup;
  transactionConfigForm!: FormGroup;
  penaltyConfigForm!: FormGroup;
  serviceChargeBracketForm!: FormGroup;

  // Edit states
  editingCategory: Category | null = null;
  editingBranch: Branch | null = null;
  editingVoucher: VoucherType | null = null;

  // Advanced features
  selectedCategories: Set<number> = new Set();
  selectedBranches: Set<number> = new Set();
  selectedVouchers: Set<number> = new Set();
  auditTrail: AuditLogEntry[] = [];
  systemStats: SystemStats | null = null;
  showBulkActions = false;
  showAuditTrail = false;
  showStatistics = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {
    this.initializeForms();
  }



  ngOnInit(): void {
    console.log('🎯 Admin Settings Init - Active Tab:', this.activeTab);
    this.loadAllSettings();
  }

  initializeForms(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required]],
      interest_rate: [3.0, [Validators.required, Validators.min(0.1), Validators.max(50)]],
      is_active: [true]
    });

    this.branchForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3), Validators.pattern(/^[A-Z]{3}$/)]],
      address: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.email]],
      manager_name: ['', [Validators.required]],
      is_active: [true]
    });

    this.voucherForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10)]],
      type: ['CASH', [Validators.required]],
      description: ['', [Validators.required]],
      is_active: [true]
    });



    this.branchConfigForm = this.fb.group({
      currentBranchId: ['', [Validators.required]],
      installationType: ['branch', [Validators.required]],
      syncEnabled: [true]
    });

    this.transactionConfigForm = this.fb.group({
      prefix: ['TXN', [Validators.required, Validators.minLength(2), Validators.maxLength(5)]],
      includeYear: [true],
      includeMonth: [true],
      includeDay: [true],
      sequenceDigits: [2, [Validators.required, Validators.min(2), Validators.max(4)]],
      separator: ['-', [Validators.required]]
    });

    this.penaltyConfigForm = this.fb.group({
      monthly_penalty_rate: [0.02, [Validators.required, Validators.min(0.001), Validators.max(1)]],
      daily_penalty_threshold_days: [3, [Validators.required, Validators.min(1), Validators.max(30)]],
      grace_period_days: [0, [Validators.required, Validators.min(0), Validators.max(30)]],
      penalty_compounding: [0, [Validators.required]],
      max_penalty_multiplier: [12, [Validators.required, Validators.min(1), Validators.max(100)]]
    });

    this.serviceChargeBracketForm = this.fb.group({
      bracket_name: ['', [Validators.required, Validators.minLength(3)]],
      min_amount: [0, [Validators.required, Validators.min(0)]],
      max_amount: [null],
      service_charge: [0, [Validators.required, Validators.min(0)]],
      display_order: [1, [Validators.required, Validators.min(1)]]
    });
  }

  loadAllSettings(): void {
    this.isLoading = true;
    Promise.all([
      this.loadBranchConfig(),
      this.loadCategories(),
      this.loadBranches(),
      this.loadVoucherTypes(),
      this.loadTransactionConfig(),
      this.loadPenaltyConfig(),
      this.loadServiceChargeConfig()
    ]).finally(() => {
      this.isLoading = false;
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
    });
  }

  // Categories Management
  async loadCategories(): Promise<void> {
    try {
      const response = await this.http.get<any>('http://localhost:3000/api/admin/categories').toPromise();
      this.categories = response.data || [];
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      // Initialize with default categories
      this.categories = [
        { name: 'Jewelry', description: 'Gold, silver, watches, precious stones', interest_rate: 3.0, is_active: true },
        { name: 'Appliance', description: 'Home electronics, appliances', interest_rate: 6.0, is_active: true }
      ];
    }
  }

  saveCategory(): void {
    if (!this.categoryForm.valid) {
      this.toastService.showError('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    const categoryData = this.categoryForm.value;

    if (this.editingCategory) {
      this.updateCategory(this.editingCategory.id!, categoryData);
    } else {
      this.createCategory(categoryData);
    }
  }

  createCategory(categoryData: Category): void {
    this.http.post<{success: boolean, message: string, data?: any}>('http://localhost:3000/api/admin/categories', categoryData).subscribe({
      next: (response) => {
        if (response.success) {
          this.categories.push(response.data);
          this.toastService.showSuccess('Category Created', response.message || 'Category created successfully!');
          this.resetCategoryForm();
        } else {
          this.toastService.showError('Creation Failed', response.message || 'Failed to create category.');
        }
      },
      error: (error) => {
        console.error('Error creating category:', error);
        const errorMessage = error.error?.message || error.message || 'An unexpected error occurred while creating category.';
        this.toastService.showError('Creation Failed', errorMessage);
        // For demo, add to local array
        this.categories.push({ ...categoryData, id: Date.now() });
        this.toastService.showWarning('Demo Mode', 'Category added locally (demo mode).');
        this.resetCategoryForm();
      }
    });
  }

  updateCategory(id: number, categoryData: Category): void {
    this.http.put<{success: boolean, message: string, data?: any}>(`http://localhost:3000/api/admin/categories/${id}`, categoryData).subscribe({
      next: (response) => {
        if (response.success) {
          const index = this.categories.findIndex(c => c.id === id);
          if (index !== -1) {
            this.categories[index] = response.data;
          }
          this.toastService.showSuccess('Category Updated', response.message || 'Category updated successfully!');
          this.resetCategoryForm();
        } else {
          this.toastService.showError('Update Failed', response.message || 'Failed to update category.');
        }
      },
      error: (error) => {
        console.error('Error updating category:', error);
        const errorMessage = error.error?.message || error.message || 'An unexpected error occurred while updating category.';
        this.toastService.showError('Update Failed', errorMessage);
        // For demo, update local array
        const index = this.categories.findIndex(c => c.id === id);
        if (index !== -1) {
          this.categories[index] = { ...categoryData, id };
        }
        this.toastService.showWarning('Demo Mode', 'Category updated locally (demo mode).');
        this.resetCategoryForm();
      }
    });
  }

  editCategory(category: Category): void {
    this.editingCategory = category;
    this.categoryForm.patchValue(category);
  }

  deleteCategory(id: number): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.http.delete(`http://localhost:3000/api/admin/categories/${id}`).subscribe({
        next: () => {
          this.categories = this.categories.filter(c => c.id !== id);
        },
        error: (error) => {
          console.error('Error deleting category:', error);
          // For demo, remove from local array
          this.categories = this.categories.filter(c => c.id !== id);
        }
      });
    }
  }

  resetCategoryForm(): void {
    this.categoryForm.reset({
      interest_rate: 3.0,
      is_active: true
    });
    this.editingCategory = null;
  }

  // Branches Management
  async loadBranches(): Promise<void> {
    try {
      console.log('🏢 Loading branches...');
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      const response = await this.http.get<any>('http://localhost:3000/api/branches').toPromise();
      console.log('✅ Branches response:', response);
      this.branches = response.data || [];
      console.log('📊 Loaded branches count:', this.branches.length);
    } catch (error) {
      console.error('❌ Error loading branches:', error);
      // Initialize with default branches
      this.branches = [
        {
          name: 'Main Branch',
          code: 'MAIN',
          address: '123 Main Street, Binondo, Manila, Philippines',
          phone: '+63-2-123-4567',
          email: 'main@goldwin.ph',
          manager_name: 'Juan Dela Cruz',
          is_active: true
        }
      ];
    }
  }

  saveBranch(): void {
    if (this.branchForm.valid) {
      const branchData = this.branchForm.value;

      if (this.editingBranch) {
        this.updateBranch(this.editingBranch.id!, branchData);
      } else {
        this.createBranch(branchData);
      }
    }
  }

  createBranch(branchData: Branch): void {
    this.http.post<any>('http://localhost:3000/api/branches', branchData).subscribe({
      next: (response) => {
        this.branches.push(response.data);
        this.resetBranchForm();
      },
      error: (error) => {
        console.error('Error creating branch:', error);
        // For demo, add to local array
        this.branches.push({ ...branchData, id: Date.now() });
        this.resetBranchForm();
      }
    });
  }

  updateBranch(id: number, branchData: Branch): void {
    this.http.put<any>(`http://localhost:3000/api/branches/${id}`, branchData).subscribe({
      next: (response) => {
        const index = this.branches.findIndex(b => b.id === id);
        if (index !== -1) {
          this.branches[index] = response.data;
        }
        this.resetBranchForm();
      },
      error: (error) => {
        console.error('Error updating branch:', error);
        // For demo, update local array
        const index = this.branches.findIndex(b => b.id === id);
        if (index !== -1) {
          this.branches[index] = { ...branchData, id };
        }
        this.resetBranchForm();
      }
    });
  }

  editBranch(branch: Branch): void {
    this.editingBranch = branch;
    this.branchForm.patchValue(branch);
  }

  deleteBranch(id: number): void {
    if (confirm('Are you sure you want to delete this branch?')) {
      this.http.delete(`http://localhost:3000/api/branches/${id}`).subscribe({
        next: () => {
          this.branches = this.branches.filter(b => b.id !== id);
        },
        error: (error) => {
          console.error('Error deleting branch:', error);
          // For demo, remove from local array
          this.branches = this.branches.filter(b => b.id !== id);
        }
      });
    }
  }

  resetBranchForm(): void {
    this.branchForm.reset({
      is_active: true
    });
    this.editingBranch = null;
  }

  // Voucher Types Management
  async loadVoucherTypes(): Promise<void> {
    try {
      const response = await this.http.get<any>('http://localhost:3000/api/admin/voucher-types').toPromise();
      this.voucherTypes = response.data || [];
    } catch (error) {
      console.error('❌ Error loading voucher types:', error);
      // Initialize with default voucher types
      this.voucherTypes = [
        { code: 'CASH', type: 'CASH', description: 'Cash Payment', is_active: true },
        { code: 'CHK', type: 'CHEQUE', description: 'Cheque Payment', is_active: true }
      ];
    }
  }

  saveVoucherType(): void {
    if (this.voucherForm.valid) {
      const voucherData = this.voucherForm.value;

      if (this.editingVoucher) {
        this.updateVoucherType(this.editingVoucher.id!, voucherData);
      } else {
        this.createVoucherType(voucherData);
      }
    }
  }

  createVoucherType(voucherData: VoucherType): void {
    this.http.post<any>('http://localhost:3000/api/admin/voucher-types', voucherData).subscribe({
      next: (response) => {
        this.voucherTypes.push(response.data);
        this.resetVoucherForm();
      },
      error: (error) => {
        console.error('Error creating voucher type:', error);
        // For demo, add to local array
        this.voucherTypes.push({ ...voucherData, id: Date.now() });
        this.resetVoucherForm();
      }
    });
  }

  updateVoucherType(id: number, voucherData: VoucherType): void {
    this.http.put<any>(`http://localhost:3000/api/admin/voucher-types/${id}`, voucherData).subscribe({
      next: (response) => {
        const index = this.voucherTypes.findIndex(v => v.id === id);
        if (index !== -1) {
          this.voucherTypes[index] = response.data;
        }
        this.resetVoucherForm();
      },
      error: (error) => {
        console.error('Error updating voucher type:', error);
        // For demo, update local array
        const index = this.voucherTypes.findIndex(v => v.id === id);
        if (index !== -1) {
          this.voucherTypes[index] = { ...voucherData, id };
        }
        this.resetVoucherForm();
      }
    });
  }

  editVoucherType(voucher: VoucherType): void {
    this.editingVoucher = voucher;
    this.voucherForm.patchValue(voucher);
  }

  deleteVoucherType(id: number): void {
    if (confirm('Are you sure you want to delete this voucher type?')) {
      this.http.delete(`http://localhost:3000/api/admin/voucher-types/${id}`).subscribe({
        next: () => {
          this.voucherTypes = this.voucherTypes.filter(v => v.id !== id);
        },
        error: (error) => {
          console.error('Error deleting voucher type:', error);
          // For demo, remove from local array
          this.voucherTypes = this.voucherTypes.filter(v => v.id !== id);
        }
      });
    }
  }

  resetVoucherForm(): void {
    this.voucherForm.reset({
      type: 'CASH',
      is_active: true
    });
    this.editingVoucher = null;
  }



  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
  }

  isActiveTab(tab: string): boolean {
    return this.activeTab === tab;
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['min']) return `${fieldName} is too low`;
      if (field.errors['max']) return `${fieldName} is too high`;
    }
    return '';
  }

  // =============================================
  // ADVANCED FEATURES
  // =============================================

  // Bulk Selection Methods
  toggleCategorySelection(categoryId: number): void {
    if (this.selectedCategories.has(categoryId)) {
      this.selectedCategories.delete(categoryId);
    } else {
      this.selectedCategories.add(categoryId);
    }
  }

  selectAllCategories(): void {
    this.categories.forEach(cat => {
      if (cat.id) this.selectedCategories.add(cat.id);
    });
  }

  clearCategorySelection(): void {
    this.selectedCategories.clear();
  }

  // Bulk Actions
  bulkActivateCategories(): void {
    const categoryIds = Array.from(this.selectedCategories);
    if (categoryIds.length === 0) return;

    this.http.patch<any>('http://localhost:3000/api/admin-advanced/categories/bulk-status', {
      category_ids: categoryIds,
      is_active: true
    }).subscribe({
      next: (response) => {
        this.loadCategories();
        this.clearCategorySelection();
        alert(`Successfully activated ${response.data.length} categories`);
      },
      error: (error) => {
        console.error('Error bulk activating categories:', error);
        alert('Error bulk activating categories');
      }
    });
  }

  bulkDeactivateCategories(): void {
    const categoryIds = Array.from(this.selectedCategories);
    if (categoryIds.length === 0) return;

    this.http.patch<any>('http://localhost:3000/api/admin-advanced/categories/bulk-status', {
      category_ids: categoryIds,
      is_active: false
    }).subscribe({
      next: (response) => {
        this.loadCategories();
        this.clearCategorySelection();
        alert(`Successfully deactivated ${response.data.length} categories`);
      },
      error: (error) => {
        console.error('Error bulk deactivating categories:', error);
        alert('Error bulk deactivating categories');
      }
    });
  }

  // Audit Trail
  loadAuditTrail(): void {
    this.http.get<any>('http://localhost:3000/api/admin-advanced/audit-trail').subscribe({
      next: (response) => {
        this.auditTrail = response.data;
        this.showAuditTrail = true;
      },
      error: (error) => {
        console.error('Error loading audit trail:', error);
        this.auditTrail = [];
      }
    });
  }

  // System Statistics
  loadSystemStats(): void {
    this.http.get<any>('http://localhost:3000/api/admin-advanced/statistics').subscribe({
      next: (response) => {
        this.systemStats = response.data;
        this.showStatistics = true;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.systemStats = null;
      }
    });
  }

  // Toggle Advanced Features
  toggleBulkActions(): void {
    this.showBulkActions = !this.showBulkActions;
    if (!this.showBulkActions) {
      this.clearCategorySelection();
    }
  }

  // Export Data
  exportCategories(): void {
    const dataStr = JSON.stringify(this.categories, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `categories_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportBranches(): void {
    const dataStr = JSON.stringify(this.branches, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `branches_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatAuditAction(action: string): string {
    switch (action) {
      case 'CREATE': return '➕ Created';
      case 'UPDATE': return '✏️ Updated';
      case 'DELETE': return '🗑️ Deleted';
      default: return action;
    }
  }

  // Branch Configuration Methods
  loadBranchConfig(): Promise<void> {
    console.log('🔄 Loading branch configuration...');
    return new Promise((resolve, reject) => {
      this.http.get<{success: boolean, data: BranchConfig}>('http://localhost:3000/api/branch-config').subscribe({
        next: (response) => {
          console.log('✅ Branch config loaded:', response);
          if (response.success) {
            this.branchConfig = response.data;
            console.log('📋 Branch config data:', this.branchConfig);
            // Update form with current values
            if (this.branchConfig.config) {
              this.branchConfigForm.patchValue({
                currentBranchId: parseInt(this.branchConfig.config.current_branch_id),
                installationType: this.branchConfig.config.installation_type,
                syncEnabled: this.branchConfig.config.sync_enabled === 'true'
              });
              console.log('📝 Form updated with values');
            }
          }
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading branch configuration:', error);
          reject(error);
        }
      });
    });
  }

  saveBranchConfig(): void {
    if (!this.branchConfigForm.valid) {
      this.toastService.showError('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    const formData = this.branchConfigForm.value;

    this.http.put<{success: boolean, message: string, data?: any}>('http://localhost:3000/api/branch-config', {
      currentBranchId: formData.currentBranchId,
      installationType: formData.installationType,
      syncEnabled: formData.syncEnabled
    }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Branch configuration updated successfully');
          this.toastService.showSuccess(
            'Configuration Updated',
            response.message || 'Branch configuration has been updated successfully.'
          );
          this.loadBranchConfig(); // Reload to get updated data
        } else {
          this.toastService.showError(
            'Update Failed',
            response.message || 'Failed to update branch configuration.'
          );
        }
      },
      error: (error) => {
        console.error('❌ Error updating branch configuration:', error);
        const errorMessage = error.error?.message || error.message || 'An unexpected error occurred while updating branch configuration.';
        this.toastService.showError('Update Failed', errorMessage);
      }
    });
  }

  triggerSync(): void {
    this.http.post<{success: boolean, message: string}>('http://localhost:3000/api/branch-config/sync-status', {
      syncTimestamp: new Date().toISOString(),
      syncType: 'manual',
      recordsCount: 0
    }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Sync status updated');
          this.toastService.showSuccess(
            'Sync Triggered',
            response.message || 'Manual sync has been triggered successfully.'
          );
          this.loadBranchConfig(); // Reload to get updated sync timestamp
        } else {
          this.toastService.showError(
            'Sync Failed',
            response.message || 'Failed to trigger manual sync.'
          );
        }
      },
      error: (error) => {
        console.error('❌ Error updating sync status:', error);
        const errorMessage = error.error?.message || error.message || 'An unexpected error occurred while triggering sync.';
        this.toastService.showError('Sync Failed', errorMessage);
      }
    });
  }

  // Transaction Configuration Methods
  loadTransactionConfig(): Promise<void> {
    console.log('🔄 Loading transaction configuration...');
    return new Promise((resolve, reject) => {
      this.http.get<{success: boolean, data: TransactionConfig}>('http://localhost:3000/api/admin/transaction-config').subscribe({
        next: (response) => {
          console.log('✅ Transaction config loaded:', response);
          if (response.success && response.data) {
            this.transactionConfig = response.data;
            this.transactionConfigForm.patchValue(response.data);
            console.log('📝 Transaction form updated with values');
          }
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading transaction configuration:', error);
          // Use default config on error
          this.transactionConfigForm.patchValue(this.transactionConfig);
          resolve();
        }
      });
    });
  }

  saveTransactionConfig(): void {
    if (!this.transactionConfigForm.valid) {
      this.toastService.showError('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    const formData = this.transactionConfigForm.value;

    // Update local config
    this.transactionConfig = { ...formData };

    this.http.put<{success: boolean, message: string, data?: any}>('http://localhost:3000/api/admin/transaction-config', this.transactionConfig).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Transaction configuration updated successfully');
          this.toastService.showSuccess(
            'Configuration Updated',
            response.message || 'Transaction number configuration updated successfully.'
          );
        } else {
          this.toastService.showError(
            'Update Failed',
            response.message || 'Failed to update transaction configuration.'
          );
        }
      },
      error: (error) => {
        console.error('❌ Error updating transaction configuration:', error);
        const errorMessage = error.error?.message || error.message || 'An unexpected error occurred while updating transaction configuration.';
        this.toastService.showError('Update Failed', errorMessage);
      }
    });
  }

  generatePreviewTransactionNumber(): string {
    const config = { ...this.transactionConfig, ...this.transactionConfigForm.value };
    const today = new Date();
    const parts = [];

    // Add prefix
    if (config.prefix) {
      parts.push(config.prefix);
    }

    // Build date part (concatenated without separators)
    let datePart = '';
    if (config.includeYear) {
      datePart += today.getFullYear().toString();
    }
    if (config.includeMonth) {
      datePart += (today.getMonth() + 1).toString().padStart(2, '0');
    }
    if (config.includeDay) {
      datePart += today.getDate().toString().padStart(2, '0');
    }

    // Add date part if any date components are enabled
    if (datePart) {
      parts.push(datePart);
    }

    // Add sequence number
    const sequenceDigits = config.sequenceDigits || 6;
    parts.push('1'.padStart(sequenceDigits, '0'));

    // Join with separator
    const separator = config.separator || '-';
    return parts.join(separator);
  }

  // Update branch code validation
  validateBranchCode(control: any): {[key: string]: any} | null {
    const value = control.value;
    if (!value) return null;

    // Check if exactly 3 characters and all uppercase letters
    if (!/^[A-Z]{3}$/.test(value)) {
      return { 'invalidBranchCode': { value: value } };
    }

    return null;
  }

  // =============================================
  // PENALTY CONFIGURATION METHODS
  // =============================================

  async loadPenaltyConfig(): Promise<void> {
    try {
      const response = await this.http.get<any>(
        'http://localhost:3000/api/penalty-config',
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      ).toPromise();

      if (response?.success && response?.data) {
        this.penaltyConfig = response.data;

        // Update form with current values
        const configMap: { [key: string]: number } = {};
        this.penaltyConfig.forEach(config => {
          configMap[config.config_key] = config.config_value;
        });

        this.penaltyConfigForm.patchValue(configMap);
      }
    } catch (error) {
      console.error('❌ Error loading penalty config:', error);
      this.toastService.showError('Load Failed', 'Failed to load penalty configuration');
    }
  }

  async savePenaltyConfig(): Promise<void> {
    const formData = this.penaltyConfigForm.value;

    try {
      const updatePromises = Object.entries(formData).map(([key, value]) =>
        this.http.put<any>(
          `http://localhost:3000/api/penalty-config/${key}`,
          { configValue: value },
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).toPromise()
      );

      await Promise.all(updatePromises);

      this.toastService.showSuccess('Success', 'Penalty configuration updated successfully');
      await this.loadPenaltyConfig();
    } catch (error) {
      console.error('❌ Error saving penalty config:', error);
      this.toastService.showError('Save Failed', 'Failed to update penalty configuration');
    }
  }

  async testPenaltyCalculation(): Promise<void> {
    try {
      const testData = {
        principalAmount: 15000,
        maturityDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        currentDate: new Date()
      };

      const response = await this.http.post<any>(
        'http://localhost:3000/api/penalty-config/calculate',
        testData,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      ).toPromise();

      if (response?.success) {
        const calculation = response.data;
        const message = `Test Result:
Principal: ₱${testData.principalAmount.toLocaleString()}
Days Overdue: ${calculation.daysOverdue}
Penalty: ₱${calculation.penaltyAmount.toLocaleString()}
Method: ${calculation.calculationMethod}`;

        this.toastService.showInfo('Penalty Test', message);
      }
    } catch (error) {
      console.error('❌ Error testing penalty calculation:', error);
      this.toastService.showError('Test Failed', 'Failed to test penalty calculation');
    }
  }

  // =============================================
  // SERVICE CHARGE CONFIGURATION METHODS
  // =============================================

  async loadServiceChargeConfig(): Promise<void> {
    try {
      const response = await this.http.get<any>(
        'http://localhost:3000/api/service-charge-config',
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      ).toPromise();

      if (response?.success && response?.data) {
        this.serviceChargeConfig = response.data;
      }
    } catch (error) {
      console.error('❌ Error loading service charge config:', error);
      this.toastService.showError('Load Failed', 'Failed to load service charge configuration');
    }
  }

  async saveServiceChargeBracket(): Promise<void> {
    if (this.serviceChargeBracketForm.invalid) {
      this.toastService.showError('Invalid Form', 'Please fix form errors before saving');
      return;
    }

    const formData = this.serviceChargeBracketForm.value;

    try {
      if (this.editingServiceChargeBracket) {
        // Update existing bracket
        await this.http.put<any>(
          `http://localhost:3000/api/service-charge-config/brackets/${this.editingServiceChargeBracket.id}`,
          formData,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).toPromise();

        this.toastService.showSuccess('Success', 'Service charge bracket updated successfully');
        this.editingServiceChargeBracket = null;
      } else {
        // Create new bracket
        await this.http.post<any>(
          'http://localhost:3000/api/service-charge-config/brackets',
          formData,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).toPromise();

        this.toastService.showSuccess('Success', 'Service charge bracket created successfully');
      }

      this.serviceChargeBracketForm.reset();
      await this.loadServiceChargeConfig();
    } catch (error) {
      console.error('❌ Error saving service charge bracket:', error);
      this.toastService.showError('Save Failed', 'Failed to save service charge bracket');
    }
  }

  editServiceChargeBracket(bracket: ServiceChargeBracket): void {
    this.editingServiceChargeBracket = bracket;
    this.serviceChargeBracketForm.patchValue({
      bracket_name: bracket.bracket_name,
      min_amount: bracket.min_amount,
      max_amount: bracket.max_amount,
      service_charge: bracket.service_charge,
      display_order: bracket.display_order
    });
  }

  async deleteServiceChargeBracket(bracketId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this service charge bracket?')) {
      return;
    }

    try {
      await this.http.delete<any>(
        `http://localhost:3000/api/service-charge-config/brackets/${bracketId}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      ).toPromise();

      this.toastService.showSuccess('Success', 'Service charge bracket deleted successfully');
      await this.loadServiceChargeConfig();
    } catch (error) {
      console.error('❌ Error deleting service charge bracket:', error);
      this.toastService.showError('Delete Failed', 'Failed to delete service charge bracket');
    }
  }

  async testServiceChargeCalculation(): Promise<void> {
    try {
      const testData = { principalAmount: 250 };

      const response = await this.http.post<any>(
        'http://localhost:3000/api/service-charge-config/calculate',
        testData,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      ).toPromise();

      if (response?.success) {
        const calculation = response.data;
        const message = `Test Result:
Principal: ₱${testData.principalAmount.toLocaleString()}
Service Charge: ₱${calculation.serviceChargeAmount.toLocaleString()}
Method: ${calculation.calculationMethod}
Bracket: ${calculation.bracketUsed || 'N/A'}`;

        this.toastService.showInfo('Service Charge Test', message);
      }
    } catch (error) {
      console.error('❌ Error testing service charge calculation:', error);
      this.toastService.showError('Test Failed', 'Failed to test service charge calculation');
    }
  }

  cancelServiceChargeBracketEdit(): void {
    this.editingServiceChargeBracket = null;
    this.serviceChargeBracketForm.reset();
  }
}

