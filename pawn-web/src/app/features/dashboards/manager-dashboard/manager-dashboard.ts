import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatisticsService } from '../../../core/services/statistics.service';
import { TransactionService } from '../../../core/services/transaction.service';

interface DashboardCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  route: string;
  amount?: number;
  percentage?: number;
}

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

interface BranchData {
  id: string;
  name: string;
  location: string;
  loans_count: number;
  revenue: number;
  status: 'active' | 'inactive';
}

interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class ManagerDashboard implements OnInit, OnDestroy {
  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  transactionCards: DashboardCard[] = [];
  recentTransactions: Transaction[] = [];
  branchData: BranchData[] = [];
  performanceMetrics: PerformanceMetric[] = [];
  selectedPeriod = 'month';
  expandedTransactionIds: Set<number> = new Set();
  private refreshInterval: any;

  // Toast notification properties
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' | 'info' = 'info';

  constructor(
    private statisticsService: StatisticsService,
    private transactionService: TransactionService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.loadRecentTransactions();
    this.updateTime();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  private startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 30000);
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadDashboardData() {
    this.isLoading = true;

    try {
      // Fetch today's statistics from API
      const response = await this.statisticsService.getTodayStatistics();

      if (response.success && response.data) {
        const stats = response.data;

        // Create transaction cards from real data with safe property access
        this.transactionCards = [
          {
            title: 'New Loan',
            count: stats.newLoan?.count || 0,
            icon: 'newloan',
            color: 'blue',
            route: '/transactions/list',
            amount: stats.newLoan?.totalAmount || 0
          },
          {
            title: 'Additional',
            count: stats.additional?.count || 0,
            icon: 'additional',
            color: 'indigo',
            route: '/transactions/list',
            amount: stats.additional?.totalAmount || 0
          },
          {
            title: 'Renew',
            count: stats.renew?.count || 0,
            icon: 'renew',
            color: 'purple',
            route: '/transactions/list',
            amount: stats.renew?.totalAmount || 0
          },
          {
            title: 'Partial',
            count: stats.partial?.count || 0,
            icon: 'partial',
            color: 'orange',
            route: '/transactions/list',
            amount: stats.partial?.totalAmount || 0
          },
          {
            title: 'Redeem',
            count: stats.redeem?.count || 0,
            icon: 'redeem',
            color: 'teal',
            route: '/transactions/list',
            amount: stats.redeem?.totalAmount || 0
          },
          {
            title: 'Auction Sales',
            count: stats.auctionSales?.count || 0,
            icon: 'auction',
            color: 'green',
            route: '/transactions/auction-items',
            amount: stats.auctionSales?.totalAmount || 0
          }
        ];

        console.log('✅ Loaded today\'s statistics:', stats);
      } else {
        console.error('❌ Failed to load statistics:', response.message);
        this.showErrorToast('Failed to load statistics: ' + response.message);
        // Initialize with empty data
        this.transactionCards = this.getEmptyTransactionCards();
      }
    } catch (error) {
      console.error('❌ Error loading statistics:', error);
      this.showErrorToast('Error loading statistics. Please try again later.');
      // Initialize with empty data
      this.transactionCards = this.getEmptyTransactionCards();
    }

    // Mock branch data
    this.branchData = [
      {
        id: 'BR001',
        name: 'Main Branch',
        location: 'Quezon City',
        loans_count: 456,
        revenue: 850000,
        status: 'active'
      },
      {
        id: 'BR002',
        name: 'Makati Branch',
        location: 'Makati City',
        loans_count: 389,
        revenue: 720000,
        status: 'active'
      },
      {
        id: 'BR003',
        name: 'Cebu Branch',
        location: 'Cebu City',
        loans_count: 267,
        revenue: 480000,
        status: 'active'
      },
      {
        id: 'BR004',
        name: 'Davao Branch',
        location: 'Davao City',
        loans_count: 135,
        revenue: 250000,
        status: 'active'
      }
    ];

    // Mock performance metrics
    this.performanceMetrics = [
      {
        label: 'Loan Approval Rate',
        value: 92,
        target: 90,
        unit: '%',
        trend: 'up'
      },
      {
        label: 'Collection Rate',
        value: 88,
        target: 85,
        unit: '%',
        trend: 'up'
      },
      {
        label: 'Default Rate',
        value: 3.2,
        target: 5.0,
        unit: '%',
        trend: 'down'
      },
      {
        label: 'Customer Satisfaction',
        value: 4.7,
        target: 4.5,
        unit: '/5',
        trend: 'up'
      }
    ];

    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  private getEmptyTransactionCards(): DashboardCard[] {
    return [
      {
        title: 'New Loan',
        count: 0,
        icon: 'newloan',
        color: 'blue',
        route: '/transactions/list',
        amount: 0
      },
      {
        title: 'Additional',
        count: 0,
        icon: 'additional',
        color: 'indigo',
        route: '/transactions/list',
        amount: 0
      },
      {
        title: 'Renew',
        count: 0,
        icon: 'renew',
        color: 'purple',
        route: '/transactions/list',
        amount: 0
      },
      {
        title: 'Partial',
        count: 0,
        icon: 'partial',
        color: 'orange',
        route: '/transactions/list',
        amount: 0
      },
      {
        title: 'Redeem',
        count: 0,
        icon: 'redeem',
        color: 'teal',
        route: '/transactions/list',
        amount: 0
      },
      {
        title: 'Auction Sales',
        count: 0,
        icon: 'auction',
        color: 'green',
        route: '/transactions/auction-items',
        amount: 0
      }
    ];
  }

  private updateTime() {
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  getCardColorClasses(color: string): string {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
      red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
      purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
      teal: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400'
    };

    return colorMap[color] || colorMap['blue'];
  }

  getCardBackgroundClass(color: string): string {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
      teal: 'bg-teal-500'
    };

    return colorMap[color] || colorMap['blue'];
  }

  getBranchStatusColor(status: string): string {
    return status === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  getTrendColor(trend: string): string {
    const colorMap: { [key: string]: string } = {
      up: 'text-green-600 dark:text-green-400',
      down: 'text-red-600 dark:text-red-400',
      stable: 'text-gray-600 dark:text-gray-400'
    };

    return colorMap[trend] || colorMap['stable'];
  }

  getTrendIcon(trend: string): string {
    return trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
  }

  getPerformanceColor(value: number, target: number, unit: string): string {
    if (unit === '%' && value >= target) {
      return 'text-green-600 dark:text-green-400';
    } else if (unit === '%' && value < target) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  }

  onPeriodChange(event: any) {
    this.selectedPeriod = event.target.value;
    this.loadDashboardData(); // Reload data for new period
  }

  // Toast notification methods
  showErrorToast(message: string): void {
    this.toastType = 'error';
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 5000);
  }

  showSuccessToast(message: string): void {
    this.toastType = 'success';
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  showWarningToast(message: string): void {
    this.toastType = 'warning';
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  closeToast(): void {
    this.showToast = false;
  }

  // Recent Transactions Methods
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


