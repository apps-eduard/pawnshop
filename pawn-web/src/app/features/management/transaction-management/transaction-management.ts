import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule, ActivatedRoute } from '@angular/router';

interface Transaction {
  id: number;
  ticket_number: string;
  transaction_type: string;
  principal_amount: number;
  total_amount: number;
  balance_remaining: number;
  status: string;
  loan_date: string;
  maturity_date: string;
  first_name: string;
  last_name: string;
  branch_name: string;
}

interface TransactionStats {
  total_transactions: number;
  today_transactions: number;
  active_loans: number;
  active_amount: number;
  avg_loan_amount: number;
}

@Component({
  selector: 'app-transaction-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './transaction-management.html',
  styleUrls: ['./transaction-management.css']
})
export class TransactionManagement implements OnInit {
  transactions: Transaction[] = [];
  stats: TransactionStats | null = null;
  loading = false;
  searchForm: FormGroup;

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalTransactions = 0;

  // Filter options
  transactionTypes = [
    { value: '', label: 'All Types' },
    { value: 'pawn_ticket', label: 'Pawn Ticket' }
  ];

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'renewed', label: 'Renewed' },
    { value: 'redeemed', label: 'Redeemed' },
    { value: 'expired', label: 'Expired' },
    { value: 'auctioned', label: 'Auctioned' }
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    console.log('🎯 TransactionManagement constructor called!');
    console.log('🎯 HTTP Client available:', !!this.http);
    console.log('🎯 Form Builder available:', !!this.fb);

    this.searchForm = this.fb.group({
      search: [''],
      type: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    console.log('🎯 Search form created:', this.searchForm);
    console.log('🎯 TransactionManagement constructor completed!');
  }

  ngOnInit(): void {
    console.log('🚀 TransactionManagement component initialized');
    console.log('📝 Form initial value:', this.searchForm.value);

    // Check for query parameters (e.g., date=today from cashier dashboard)
    this.route.queryParams.subscribe(params => {
      console.log('🔍 Query params received:', params);

      if (params['date'] === 'today') {
        const today = new Date().toISOString().split('T')[0];
        console.log('📅 Setting today date filter:', today);
        this.searchForm.patchValue({
          dateFrom: today,
          dateTo: today
        });
      }
    });

    this.loadTransactions();
    this.loadStats();

    // Auto-search on form changes with debounce
    this.searchForm.valueChanges.subscribe(() => {
      console.log('📋 Form changed, reloading transactions...');
      setTimeout(() => this.loadTransactions(), 300);
    });

    console.log('✅ TransactionManagement ngOnInit completed');
  }

  loadTransactions(): void {
    console.log('🔄 Starting loadTransactions...');
    this.loading = true;
    const formValue = this.searchForm.value;

    const params = new URLSearchParams({
      page: this.currentPage.toString(),
      limit: this.pageSize.toString(),
      ...formValue
    });

    // Remove empty values
    Object.keys(formValue).forEach(key => {
      if (!formValue[key]) {
        params.delete(key);
      }
    });

    // Use /api/transactions instead of /api/admin/transactions for cashier access
    const url = `http://localhost:3000/api/transactions?${params}`;
    console.log('🌐 Making request to:', url);
    console.log('📊 Current loading state:', this.loading);

    this.http.get<{success: boolean, data: Transaction[], pagination: any}>(url).subscribe({
      next: (response) => {
        console.log('✅ API Response received:', response);
        if (response.success) {
          this.transactions = response.data || [];
          this.totalTransactions = response.pagination?.total || 0;
          console.log('📋 Transactions set:', this.transactions.length, 'items');
          console.log('📈 Total transactions:', this.totalTransactions);
        } else {
          console.warn('⚠️ API returned success=false:', response);
        }
        this.loading = false;
        console.log('🏁 Loading completed, loading state:', this.loading);
      },
      error: (error) => {
        console.error('❌ Error loading transactions:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error status:', error.status);
        this.loading = false;

        // Set empty array for debugging
        this.transactions = [];
        this.totalTransactions = 0;
        console.log('🔧 Set empty transactions for debugging');
      }
    });
  }

  loadStats(): void {
    // Stats endpoint is admin-only, so we'll skip it for now
    // or implement a cashier-friendly stats endpoint later
    console.log('📊 Skipping stats load for cashier users');
    this.stats = null;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTransactions();
  }

  clearFilters(): void {
    this.searchForm.reset();
    this.currentPage = 1;
    this.loadTransactions();
  }

  exportTransactions(): void {
    console.log('📤 Exporting transactions...');
    // TODO: Implement export functionality
  }

  updateTransactionStatus(transaction: Transaction, newStatus: string): void {
    const reason = prompt(`Enter reason for changing status of ${transaction.ticket_number} to ${newStatus}:`);
    if (!reason) return;

    this.http.put(`http://localhost:3000/api/admin/transactions/${transaction.id}/status`, {
      status: newStatus,
      reason
    }).subscribe({
      next: () => {
        console.log('✅ Transaction status updated');
        this.loadTransactions();
      },
      error: (error) => {
        console.error('❌ Error updating status:', error);
        alert('Failed to update transaction status');
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const statusClasses: {[key: string]: string} = {
      'active': 'bg-green-100 text-green-800',
      'redeemed': 'bg-blue-100 text-blue-800',
      'renewed': 'bg-yellow-100 text-yellow-800',
      'defaulted': 'bg-red-100 text-red-800',
      'partial': 'bg-orange-100 text-orange-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  getTypeClass(type: string): string {
    const typeClasses: {[key: string]: string} = {
      'new_loan': 'bg-purple-100 text-purple-800',
      'additional': 'bg-indigo-100 text-indigo-800',
      'redeem': 'bg-green-100 text-green-800',
      'partial_payment': 'bg-orange-100 text-orange-800',
      'renew': 'bg-yellow-100 text-yellow-800'
    };
    return typeClasses[type] || 'bg-gray-100 text-gray-800';
  }

  trackByTransactionId(index: number, transaction: Transaction): number {
    return transaction.id;
  }

  // Helper methods for template
  Math = Math;

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  ceil(value: number): number {
    return Math.ceil(value);
  }
}
