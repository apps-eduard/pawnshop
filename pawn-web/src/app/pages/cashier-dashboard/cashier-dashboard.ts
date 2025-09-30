import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface DashboardCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  route: string;
  amount?: number;
}

interface Transaction {
  id: string;
  type: 'new_loan' | 'payment' | 'renewal' | 'redemption';
  customer_name: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: Date;
}

@Component({
  selector: 'app-cashier-dashboard',
  templateUrl: './cashier-dashboard.html',
  styleUrl: './cashier-dashboard.css',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class CashierDashboard implements OnInit {
  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  recentTransactions: Transaction[] = [];

  ngOnInit() {
    this.loadDashboardData();
    this.updateTime();
  }

  private loadDashboardData() {
    this.isLoading = true;

    // Mock dashboard data for Cashier
    this.dashboardCards = [
      {
        title: 'Today\'s Loans',
        count: 12,
        icon: 'loans',
        color: 'blue',
        route: '/loans',
        amount: 180000
      },
      {
        title: 'Payments Received',
        count: 8,
        icon: 'payments',
        color: 'green',
        route: '/payments',
        amount: 75000
      },
      {
        title: 'Renewals',
        count: 5,
        icon: 'renewals',
        color: 'orange',
        route: '/renewals',
        amount: 45000
      },
      {
        title: 'Due Today',
        count: 3,
        icon: 'due',
        color: 'red',
        route: '/due-today',
        amount: 35000
      }
    ];

    // Mock recent transactions
    this.recentTransactions = [
      {
        id: 'TXN001',
        type: 'new_loan',
        customer_name: 'Maria Santos',
        amount: 25000,
        status: 'completed',
        created_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        id: 'TXN002',
        type: 'payment',
        customer_name: 'Juan Dela Cruz',
        amount: 15000,
        status: 'completed',
        created_at: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      },
      {
        id: 'TXN003',
        type: 'renewal',
        customer_name: 'Anna Garcia',
        amount: 8000,
        status: 'completed',
        created_at: new Date(Date.now() - 90 * 60 * 1000) // 1.5 hours ago
      },
      {
        id: 'TXN004',
        type: 'redemption',
        customer_name: 'Pedro Rodriguez',
        amount: 30000,
        status: 'completed',
        created_at: new Date(Date.now() - 120 * 60 * 1000) // 2 hours ago
      }
    ];

    setTimeout(() => {
      this.isLoading = false;
    }, 500);
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
      indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
    };

    return colorMap[color] || colorMap['blue'];
  }

  getTransactionTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      new_loan: 'New Loan',
      payment: 'Payment',
      renewal: 'Renewal',
      redemption: 'Redemption'
    };

    return typeMap[type] || type;
  }

  getTransactionTypeColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      new_loan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      payment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      renewal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      redemption: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return colorMap[type] || colorMap['new_loan'];
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    return colorMap[status] || colorMap['pending'];
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
}
