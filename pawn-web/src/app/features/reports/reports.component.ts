import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);

  isLoading = false;
  activeTab = 'transactions'; // transactions, revenue, categories, vouchers, expired
  activeDateRange = 'month'; // Track which date range button is active

  // Date filters - default to last 30 days
  startDate = this.getDateDaysAgo(30);
  endDate = this.getToday();

  // Reports data
  transactionReport: any = null;
  revenueReport: any = null;
  categoryReport: any = null;
  voucherReport: any = null;
  expiredItemsReport: any = null;

  ngOnInit() {
    this.loadReport();
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  setDateRange(range: string) {
    this.activeDateRange = range; // Track the active date range
    const today = new Date();
    this.endDate = this.getToday();

    switch (range) {
      case 'today':
        this.startDate = this.getToday();
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        this.startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        this.startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        this.startDate = yearAgo.toISOString().split('T')[0];
        break;
    }

    this.loadReport();
  }

  // Called when custom date inputs change
  onCustomDateChange() {
    this.activeDateRange = 'custom'; // Set to custom when user manually changes dates
    this.loadReport();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.loadReport();
  }

  async loadReport() {
    this.isLoading = true;

    try {
      switch (this.activeTab) {
        case 'transactions':
          await this.loadTransactionReport();
          break;
        case 'revenue':
          await this.loadRevenueReport();
          break;
        case 'categories':
          await this.loadCategoryReport();
          break;
        case 'vouchers':
          await this.loadVoucherReport();
          break;
        case 'expired':
          await this.loadExpiredItemsReport();
          break;
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadTransactionReport() {
    const response = await this.reportsService.getTransactionReport(this.startDate, this.endDate);
    if (response.success) {
      this.transactionReport = response.data;
    }
  }

  async loadRevenueReport() {
    const response = await this.reportsService.getRevenueReport(this.startDate, this.endDate);
    if (response.success) {
      this.revenueReport = response.data;
    }
  }

  async loadCategoryReport() {
    const response = await this.reportsService.getCategoryReport(this.startDate, this.endDate);
    if (response.success) {
      this.categoryReport = response.data;
    }
  }

  async loadVoucherReport() {
    const response = await this.reportsService.getVoucherReport(this.startDate, this.endDate);
    if (response.success) {
      this.voucherReport = response.data;
    }
  }

  async loadExpiredItemsReport() {
    const response = await this.reportsService.getExpiredItemsReport();
    if (response.success) {
      this.expiredItemsReport = response.data;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTotalTransactions(): number {
    if (!this.transactionReport) return 0;
    const txCount = this.transactionReport.transactions?.reduce((sum: number, t: any) => sum + Number(t.count), 0) || 0;
    const auctionCount = this.transactionReport.auctionSales?.reduce((sum: number, a: any) => sum + Number(a.count), 0) || 0;
    return txCount + auctionCount;
  }

  getTotalRevenue(): number {
    if (!this.revenueReport?.revenue) return 0;
    return this.revenueReport.revenue.reduce((sum: number, r: any) => sum + Number(r.total_revenue), 0);
  }

  getTotalAuctionRevenue(): number {
    if (!this.revenueReport?.auctionRevenue) return 0;
    return this.revenueReport.auctionRevenue.reduce((sum: number, a: any) => sum + Number(a.auction_revenue), 0);
  }

  getTotalVouchers(): number {
    if (!this.voucherReport) return 0;
    return this.voucherReport.reduce((sum: number, v: any) => sum + Number(v.count), 0);
  }

  getTotalVoucherAmount(): number {
    if (!this.voucherReport) return 0;
    return this.voucherReport.reduce((sum: number, v: any) => sum + Number(v.total_amount), 0);
  }
}
