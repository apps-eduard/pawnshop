import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatisticsService } from '../../../core/services/statistics.service';

interface DashboardCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  route: string;
  amount?: number;
  percentage?: number;
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
  branchData: BranchData[] = [];
  performanceMetrics: PerformanceMetric[] = [];
  selectedPeriod = 'month';
  private refreshInterval: any;

  constructor(private statisticsService: StatisticsService) {}

  ngOnInit() {
    this.loadDashboardData();
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
        // Initialize with empty data
        this.transactionCards = this.getEmptyTransactionCards();
      }
    } catch (error) {
      console.error('❌ Error loading statistics:', error);
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
}

