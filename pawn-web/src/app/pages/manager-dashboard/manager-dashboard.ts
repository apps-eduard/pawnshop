import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
export class ManagerDashboard implements OnInit {
  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  branchData: BranchData[] = [];
  performanceMetrics: PerformanceMetric[] = [];
  selectedPeriod = 'month';

  ngOnInit() {
    this.loadDashboardData();
    this.updateTime();
  }

  private loadDashboardData() {
    this.isLoading = true;

    // Mock dashboard data for Manager
    this.dashboardCards = [
      {
        title: 'Total Revenue',
        count: 2500000,
        icon: 'revenue',
        color: 'green',
        route: '/reports/revenue',
        percentage: 15
      },
      {
        title: 'Active Loans',
        count: 1247,
        icon: 'loans',
        color: 'blue',
        route: '/loans',
        amount: 18500000
      },
      {
        title: 'Branch Performance',
        count: 5,
        icon: 'branches',
        color: 'purple',
        route: '/branches',
        percentage: 8
      },
      {
        title: 'Staff Efficiency',
        count: 95,
        icon: 'efficiency',
        color: 'orange',
        route: '/staff',
        percentage: 12
      }
    ];

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
