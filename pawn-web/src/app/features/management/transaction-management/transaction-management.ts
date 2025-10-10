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
  interest_rate: number;
  interest_amount: number;
  service_charge: number;
  penalty_amount: number;
  other_charges: number;
  total_amount: number;
  balance_remaining: number;
  status: string;
  loan_date: string;
  dateGranted?: string;
  maturity_date: string;
  expiry_date: string;  // Added for display status calculation
  first_name: string;
  last_name: string;
  branch_name: string;
  transactionHistory?: Array<{
    id: number;
    transactionNumber: string;
    transactionType: string;
    transactionDate: Date;
    dateGranted?: Date;
    principalAmount: number;
    interestRate: number;
    interestAmount: number;
    penaltyRate: number;
    penaltyAmount: number;
    serviceCharge: number;
    otherCharges: number;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    discountAmount?: number;
    advanceInterest?: number;
    advanceServiceCharge?: number;
    netPayment?: number;
    newPrincipalLoan?: number;
    appraisalValue?: number;
    status: string;
    notes: string;
    createdBy: number;
    createdAt: Date;
  }>;
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
  expandedTransactions = new Set<number>(); // Track which transactions are expanded

  // Computation modal properties
  showComputationModal = false;
  selectedTransaction: Transaction | null = null;
  selectedHistory: any = null; // For viewing history computation details
  isViewingHistory = false; // Flag to know if viewing main transaction or history

  // Pagination
  currentPage = 1;
  pageSize = 50; // Optimal balance between performance and usability
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

    this.http.get<{success: boolean, data: any[], pagination: any}>(url).subscribe({
      next: (response) => {
        console.log('✅ API Response received:', response);
        if (response.success) {
          // Map the response data to ensure transactionHistory is included
          this.transactions = (response.data || []).map((row: any) => ({
            id: row.id,
            ticket_number: row.ticket_number || row.transactionNumber,
            transaction_type: row.transaction_type || row.transactionType,
            principal_amount: parseFloat(row.principal_amount || row.principalAmount || 0),
            interest_rate: parseFloat(row.interest_rate || row.interestRate || 0),
            interest_amount: parseFloat(row.interest_amount || row.interestAmount || 0),
            service_charge: parseFloat(row.service_charge || row.serviceCharge || 0),
            penalty_amount: parseFloat(row.penalty_amount || row.penaltyAmount || 0),
            other_charges: parseFloat(row.other_charges || row.otherCharges || 0),
            total_amount: parseFloat(row.total_amount || row.totalAmount || 0),
            balance_remaining: parseFloat(row.balance_remaining || row.balanceRemaining || row.balance || 0),
            status: row.status,
            loan_date: row.loan_date || row.loanDate,
            maturity_date: row.maturity_date || row.maturityDate,
            expiry_date: row.expiry_date || row.expiryDate || row.dateExpired,
            first_name: row.first_name || row.pawnerName?.split(' ')[0] || '',
            last_name: row.last_name || row.pawnerName?.split(' ')[1] || '',
            branch_name: row.branch_name || row.branchName || 'N/A',
            transactionHistory: row.transactionHistory || []
          }));
          this.totalTransactions = response.pagination?.total || 0;
          console.log('📋 Transactions set:', this.transactions.length, 'items');
          console.log('📈 Total transactions:', this.totalTransactions);
          console.log('🔍 Sample transaction:', this.transactions[0]);
          console.log('📜 Transaction history count:', this.transactions[0]?.transactionHistory?.length || 0);
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

  formatDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-PH', {
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
      'partial': 'bg-orange-100 text-orange-800',
      'expired': 'bg-red-100 text-red-800',
      'matured': 'bg-yellow-100 text-yellow-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Calculate display status based on database status and dates
   * If database status is 'active', check if it's actually expired or matured based on dates
   */
  getDisplayStatus(transaction: Transaction): string {
    // If transaction is already closed (redeemed, renewed, etc.), show that status
    if (transaction.status !== 'active') {
      return transaction.status;
    }

    // For active transactions, calculate based on dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(transaction.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const maturityDate = new Date(transaction.maturity_date);
    maturityDate.setHours(0, 0, 0, 0);

    if (today > expiryDate) {
      return 'expired';
    } else if (today >= maturityDate) {
      return 'matured';
    } else {
      return 'active';
    }
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

  // Toggle transaction history visibility
  toggleTransactionHistory(transactionId: number, event: Event) {
    console.log('🔄 Toggle called for transaction ID:', transactionId);
    console.log('📊 Current expanded state:', this.expandedTransactions.has(transactionId));
    event.stopPropagation(); // Prevent other click handlers
    if (this.expandedTransactions.has(transactionId)) {
      this.expandedTransactions.delete(transactionId);
      console.log('➖ Collapsed transaction:', transactionId);
    } else {
      this.expandedTransactions.add(transactionId);
      console.log('➕ Expanded transaction:', transactionId);
    }
    console.log('📋 All expanded transactions:', Array.from(this.expandedTransactions));
  }

  // Check if transaction is expanded
  isTransactionExpanded(transactionId: number): boolean {
    return this.expandedTransactions.has(transactionId);
  }

  // View computation details
  viewComputationDetails(transaction: Transaction, event: Event) {
    console.log('👁️ Viewing computation details for transaction:', transaction.ticket_number);
    event.stopPropagation(); // Prevent other click handlers
    this.selectedTransaction = transaction;
    this.selectedHistory = null;
    this.isViewingHistory = false;
    this.showComputationModal = true;
  }

  // View history computation details
  viewHistoryComputationDetails(transaction: Transaction, history: any, event: Event) {
    console.log('👁️ Viewing history computation details for:', history.transactionNumber);
    event.stopPropagation(); // Prevent other click handlers
    this.selectedTransaction = transaction;
    this.selectedHistory = history;
    this.isViewingHistory = true;
    this.showComputationModal = true;
  }

  // Close computation modal
  closeComputationModal() {
    console.log('❌ Closing computation modal');
    this.showComputationModal = false;
    this.selectedTransaction = null;
    this.selectedHistory = null;
    this.isViewingHistory = false;
  }

  // Get transaction type label for display
  getTransactionHistoryTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'new_loan': 'New Loan',
      'partial_payment': 'Partial Payment',
      'redemption': 'Redemption',
      'renewal': 'Renewal',
      'renew': 'Renewal',
      'redeem': 'Redemption',
      'additional': 'Additional Loan',
      'full_payment': 'Full Payment'
    };
    return labels[type] || type;
  }

  // Get transaction type label (alias for consistency)
  getTransactionTypeLabel(type: string): string {
    return this.getTransactionHistoryTypeLabel(type);
  }

  // Get transaction type badge class
  getTransactionTypeBadgeClass(type: string): string {
    const classes: { [key: string]: string } = {
      'new_loan': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'partial_payment': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'redemption': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'redeem': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'renewal': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'renew': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'additional': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'full_payment': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    return classes[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  // Print invoice
  printInvoice() {
    window.print();
  }

  // Format time ago
  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - targetDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} minute(s) ago`;
    } else if (diffMins < 1440) { // 24 hours
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour(s) ago`;
    } else {
      const diffDays = Math.floor(diffMins / 1440);
      return `${diffDays} day(s) ago`;
    }
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
