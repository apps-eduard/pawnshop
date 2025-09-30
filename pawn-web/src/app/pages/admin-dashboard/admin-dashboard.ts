import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DashboardCard } from '../../core/models/interfaces';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  dashboardCards: DashboardCard[] = [];
  isLoading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Mock data for now - will connect to API later
    this.dashboardCards = [
      {
        title: 'Total Loans',
        count: 150,
        amount: 2500000,
        icon: 'loans',
        color: 'blue',
        route: '/loans'
      },
      {
        title: 'Active Loans',
        count: 120,
        amount: 2100000,
        icon: 'active',
        color: 'green',
        route: '/loans?status=active'
      },
      {
        title: 'Expired Loans',
        count: 15,
        amount: 180000,
        icon: 'expired',
        color: 'red',
        route: '/loans?status=expired'
      },
      {
        title: 'Total Branches',
        count: 3,
        icon: 'branches',
        color: 'purple',
        route: '/branches'
      },
      {
        title: 'Total Users',
        count: 25,
        icon: 'users',
        color: 'indigo',
        route: '/users'
      },
      {
        title: 'Today Transactions',
        count: 12,
        amount: 150000,
        icon: 'transactions',
        color: 'yellow',
        route: '/transactions?date=today'
      },
      {
        title: 'Monthly Revenue',
        count: 0,
        amount: 425000,
        icon: 'revenue',
        color: 'emerald',
        route: '/reports/revenue'
      },
      {
        title: 'Auction Items',
        count: 8,
        amount: 95000,
        icon: 'auction',
        color: 'orange',
        route: '/auctions'
      }
    ];

    this.isLoading = false;
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
}
