import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VoucherService, Voucher, VoucherForm } from '../../../core/services/voucher.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-voucher-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './voucher-management.html',
  styleUrl: './voucher-management.css'
})
export class VoucherManagementComponent implements OnInit {
  vouchers: Voucher[] = [];
  filteredVouchers: Voucher[] = [];
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  // Expose Math to template
  Math = Math;

  // Forms
  voucherForm!: FormGroup;
  editingVoucher: Voucher | null = null;
  deletingVoucher: Voucher | null = null;

  // Filters
  filterType: 'all' | 'cash' | 'cheque' = 'all';
  filterTransactionType: 'all' | 'cash_in' | 'cash_out' = 'all';
  searchQuery = '';
  filterDateFrom = '';
  filterDateTo = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 0;

  // Stats
  stats = {
    totalVouchers: 0,
    totalAmount: 0,
    totalCash: 0,
    totalCheque: 0,
    cashCount: 0,
    chequeCount: 0
  };

  constructor(
    private fb: FormBuilder,
    private voucherService: VoucherService,
    private toastService: ToastService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadVouchers();
    this.loadStats();
  }

  initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.voucherForm = this.fb.group({
      type: ['cash', [Validators.required]],
      transactionType: ['cash_in', [Validators.required]],
      date: [today, [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      notes: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  loadVouchers(): void {
    this.isLoading = true;

    const filters: any = {};
    if (this.filterType !== 'all') filters.type = this.filterType;
    if (this.filterDateFrom) filters.startDate = this.filterDateFrom;
    if (this.filterDateTo) filters.endDate = this.filterDateTo;

    this.voucherService.getVouchers(this.currentPage, this.pageSize, filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.vouchers = response.data;
          this.filteredVouchers = this.vouchers;
          this.totalItems = response.pagination.total;
          this.totalPages = response.pagination.totalPages;
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vouchers:', error);
        this.toastService.showError('Error', 'Failed to load vouchers');
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.voucherService.getVoucherStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = {
            totalVouchers: response.data.total_vouchers,
            totalAmount: response.data.total_amount,
            totalCash: response.data.total_cash,
            totalCheque: response.data.total_cheque,
            cashCount: response.data.cash_count,
            chequeCount: response.data.cheque_count
          };
        }
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.vouchers];

    // Filter by type
    if (this.filterType !== 'all') {
      filtered = filtered.filter(v => v.voucher_type === this.filterType);
    }

    // Filter by transaction type
    if (this.filterTransactionType !== 'all') {
      filtered = filtered.filter(v => v.transaction_type === this.filterTransactionType);
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.notes.toLowerCase().includes(query) ||
        v.amount.toString().includes(query) ||
        v.voucher_date.includes(query)
      );
    }

    this.filteredVouchers = filtered;
  }

  openCreateModal(): void {
    this.initializeForm();
    this.showCreateModal = true;

    // Focus on the Type field after modal opens
    setTimeout(() => {
      const typeSelect = document.getElementById('voucherType') as HTMLSelectElement;
      if (typeSelect) {
        typeSelect.focus();
      }
    }, 100);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.voucherForm.reset();
  }

  openEditModal(voucher: Voucher): void {
    this.editingVoucher = voucher;
    this.voucherForm.patchValue({
      type: voucher.voucher_type,
      transactionType: voucher.transaction_type,
      date: voucher.voucher_date,
      amount: voucher.amount,
      notes: voucher.notes
    });
    this.showEditModal = true;

    // Focus on the Type field after modal opens
    setTimeout(() => {
      const typeSelect = document.getElementById('voucherTypeEdit') as HTMLSelectElement;
      if (typeSelect) {
        typeSelect.focus();
      }
    }, 100);
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingVoucher = null;
    this.voucherForm.reset();
  }

  openDeleteModal(voucher: Voucher): void {
    this.deletingVoucher = voucher;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingVoucher = null;
  }

  createVoucher(): void {
    if (!this.voucherForm.valid) {
      this.toastService.showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    const formData: VoucherForm = this.voucherForm.value;

    this.voucherService.createVoucher(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('Success', 'Voucher created successfully');
          this.closeCreateModal();
          this.loadVouchers();
          this.loadStats();
        }
      },
      error: (error) => {
        console.error('Error creating voucher:', error);
        this.toastService.showError('Error', error.error?.message || 'Failed to create voucher');
      }
    });
  }

  updateVoucher(): void {
    if (!this.voucherForm.valid || !this.editingVoucher) {
      this.toastService.showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    const formData: VoucherForm = this.voucherForm.value;

    this.voucherService.updateVoucher(this.editingVoucher.id, formData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastService.showSuccess('Success', 'Voucher updated successfully');
          this.closeEditModal();
          this.loadVouchers();
          this.loadStats();
        }
      },
      error: (error) => {
        console.error('Error updating voucher:', error);
        this.toastService.showError('Error', error.error?.message || 'Failed to update voucher');
      }
    });
  }

  deleteVoucher(): void {
    if (!this.deletingVoucher) return;

    this.voucherService.deleteVoucher(this.deletingVoucher.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('Success', 'Voucher deleted successfully');
          this.closeDeleteModal();
          this.loadVouchers();
          this.loadStats();
        }
      },
      error: (error) => {
        console.error('Error deleting voucher:', error);
        this.toastService.showError('Error', error.error?.message || 'Failed to delete voucher');
      }
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filterType = 'all';
    this.filterTransactionType = 'all';
    this.searchQuery = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyFilters();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadVouchers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadVouchers();
    }
  }

  formatCurrency(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getTypeLabel(type: string): string {
    return type === 'cash' ? 'Cash' : 'Cheque';
  }

  getTransactionTypeLabel(type: string): string {
    return type === 'cash_in' ? 'Cash In' : 'Cash Out';
  }

  getTypeColor(type: string): string {
    return type === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }

  getTransactionTypeColor(type: string): string {
    return type === 'cash_in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
  }
}
