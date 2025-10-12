import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DashboardCard } from '../../../core/models/interfaces';
import { TransactionService } from '../../../core/services/transaction.service';

interface Transaction {
  id: number;
  transaction_number: string;
  type: string;
  customer_name: string;
  amount: number;
  principal_amount: number;
  status: string;
  created_at: Date;
  loan_date: Date;
  maturity_date: Date;
  expiry_date: Date;
  items?: any[];
  transactionHistory?: any[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  dashboardCards: DashboardCard[] = [];
  recentTransactions: Transaction[] = [];
  isLoading = true;
  expandedTransactionIds: Set<number> = new Set();

  constructor(
    private http: HttpClient,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadRecentTransactions();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    // Fetch real data from API
    this.http.get<any>('http://localhost:3000/api/admin/dashboard/stats').subscribe({
      next: (response) => {
        if (response.success) {
          const stats = response.data;

          this.dashboardCards = [
            {
              title: 'Total Loans',
              count: stats.totalLoans.count,
              amount: stats.totalLoans.amount,
              icon: 'loans',
              color: 'blue',
              route: '/loans'
            },
            {
              title: 'Active Loans',
              count: stats.activeLoans.count,
              amount: stats.activeLoans.amount,
              icon: 'active',
              color: 'green',
              route: '/loans?status=active'
            },
            {
              title: 'Expired Loans',
              count: stats.expiredLoans.count,
              amount: stats.expiredLoans.amount,
              icon: 'expired',
              color: 'red',
              route: '/loans?status=expired'
            },
            {
              title: 'Total Branches',
              count: stats.branches.count,
              icon: 'branches',
              color: 'purple',
              route: '/branches'
            },
            {
              title: 'Total Users',
              count: stats.users.count,
              icon: 'users',
              color: 'indigo',
              route: '/users'
            },
            {
              title: 'Today Transactions',
              count: stats.todayTransactions.count,
              amount: stats.todayTransactions.amount,
              icon: 'transactions',
              color: 'yellow',
              route: '/transactions?date=today'
            },
            {
              title: 'Total Pawners',
              count: stats.totalPawners.count,
              icon: 'pawners',
              color: 'emerald',
              route: '/pawners'
            },
            {
              title: 'Auction Items',
              count: stats.auctionItems.count,
              amount: stats.auctionItems.amount,
              icon: 'auction',
              color: 'orange',
              route: '/auctions'
            }
          ];

          console.log('✅ Dashboard stats loaded:', stats);
        } else {
          console.error('Failed to load dashboard stats:', response);
          this.loadMockData(); // Fallback to mock data
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loadMockData(); // Fallback to mock data on error
        this.isLoading = false;
      }
    });
  }

  // Fallback mock data in case API fails
  private loadMockData(): void {
    this.dashboardCards = [
      {
        title: 'Total Loans',
        count: 0,
        amount: 0,
        icon: 'loans',
        color: 'blue',
        route: '/loans'
      },
      {
        title: 'Active Loans',
        count: 0,
        amount: 0,
        icon: 'active',
        color: 'green',
        route: '/loans?status=active'
      },
      {
        title: 'Expired Loans',
        count: 0,
        amount: 0,
        icon: 'expired',
        color: 'red',
        route: '/loans?status=expired'
      },
      {
        title: 'Total Branches',
        count: 0,
        icon: 'branches',
        color: 'purple',
        route: '/branches'
      },
      {
        title: 'Total Users',
        count: 0,
        icon: 'users',
        color: 'indigo',
        route: '/users'
      },
      {
        title: 'Today Transactions',
        count: 0,
        amount: 0,
        icon: 'transactions',
        color: 'yellow',
        route: '/transactions?date=today'
      },
      {
        title: 'Total Pawners',
        count: 0,
        icon: 'pawners',
        color: 'emerald',
        route: '/pawners'
      },
      {
        title: 'Auction Items',
        count: 0,
        amount: 0,
        icon: 'auction',
        color: 'orange',
        route: '/auctions'
      }
    ];
  }

  getCardColorClasses(color: string): string {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      purple: 'bg-purple-500 text-white',
      indigo: 'bg-indigo-500 text-white',
      yellow: 'bg-yellow-500 text-white',
      emerald: 'bg-emerald-500 text-white',
      orange: 'bg-orange-500 text-white'
    };
    return colorMap[color] || 'bg-gray-500 text-white';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  loadRecentTransactions() {
    console.log('🔄 Loading recent transactions...');
    this.transactionService.getRecentTransactions().subscribe({
      next: (response: any) => {
        console.log('📊 Transactions API Response:', response);

        // Handle both array response and {success, data} response
        let transactionsArray: any[] = [];
        if (Array.isArray(response)) {
          transactionsArray = response;
        } else if (response.success && Array.isArray(response.data)) {
          transactionsArray = response.data;
        } else {
          console.warn('⚠️ Unexpected response format:', response);
          this.recentTransactions = [];
          return;
        }

        this.recentTransactions = transactionsArray.slice(0, 5).map((transaction: any) => {
          const mappedTransaction = {
            id: parseInt(transaction.id) || 0,
            transaction_number: transaction.transactionNumber || transaction.ticketNumber || transaction.transaction_number || 'N/A',
            type: transaction.transactionType || 'new_loan',
            customer_name: transaction.pawnerName || transaction.pawner_name || `${transaction.pawnerFirstName || transaction.pawner_first_name || ''} ${transaction.pawnerLastName || transaction.pawner_last_name || ''}`.trim(),
            amount: 0,
            principal_amount: parseFloat(transaction.principalAmount || transaction.principal_amount || 0),
            status: transaction.status || 'active',
            created_at: new Date(transaction.createdAt || transaction.created_at || transaction.loanDate || transaction.loan_date),
            loan_date: new Date(transaction.loanDate || transaction.loan_date || transaction.createdAt || transaction.created_at),
            maturity_date: new Date(transaction.maturityDate || transaction.maturity_date),
            expiry_date: new Date(transaction.expiryDate || transaction.expiry_date),
            items: transaction.items || [],
            transactionHistory: transaction.transactionHistory || []
          };

          mappedTransaction.amount = this.getTransactionDisplayAmount(mappedTransaction);
          return mappedTransaction;
        });

        console.log('✅ Recent transactions loaded:', this.recentTransactions.length);
      },
      error: (error) => {
        console.error('❌ Error loading transactions:', error);
        this.recentTransactions = [];
      }
    });
  }

  getTransactionDisplayAmount(transaction: Transaction): number {
    const type = transaction.type || 'new_loan';
    if (type === 'new_loan') {
      return transaction.principal_amount || 0;
    } else if (type === 'renewal') {
      const history = transaction.transactionHistory || [];
      const renewalEntry = history.find((h: any) => h.transaction_type === 'renewal');
      return renewalEntry ? parseFloat(renewalEntry.interest_amount || 0) + parseFloat(renewalEntry.service_charge || 0) : 0;
    } else if (type === 'partial_payment') {
      const history = transaction.transactionHistory || [];
      const paymentEntry = history.find((h: any) => h.transaction_type === 'partial_payment');
      return paymentEntry ? parseFloat(paymentEntry.payment_amount || 0) : 0;
    }
    return transaction.principal_amount || 0;
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'new_loan': 'New Loan',
      'renewal': 'Renewal',
      'partial_payment': 'Payment',
      'full_payment': 'Full Payment',
      'redemption': 'Redemption',
      'auction': 'Auction'
    };
    return labels[type] || type;
  }

  getTransactionTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'new_loan': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'renewal': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'partial_payment': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'full_payment': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'redemption': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'auction': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'expired': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'renewed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'redeemed': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'auctioned': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  getAmountLabel(type: string): string {
    if (type === 'renewal') return 'Interest + Service';
    if (type === 'partial_payment' || type === 'full_payment') return 'Payment';
    return 'Principal';
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  toggleTransactionHistory(transactionId: number, event: Event): void {
    event.stopPropagation();
    if (this.expandedTransactionIds.has(transactionId)) {
      this.expandedTransactionIds.delete(transactionId);
    } else {
      this.expandedTransactionIds.add(transactionId);
    }
  }

  isTransactionExpanded(transactionId: number): boolean {
    return this.expandedTransactionIds.has(transactionId);
  }
}

