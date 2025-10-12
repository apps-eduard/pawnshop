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

  // Make Math available in template
  Math = Math;

  isLoading = false;
  activeTab = 'transactions'; // transactions, revenue, categories, vouchers, expired, cash-position
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
  cashPositionReport: any = null;

  // Denomination tracking
  denominations = {
    d1000: 0,
    d500: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    d5: 0,
    d1: 0
  };
  coinTotal = 0;
  actualTotalCash = 0;
  cashVariance = 0;

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
        case 'cash-position':
          await this.loadCashPositionReport();
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

  async loadCashPositionReport() {
    const response = await this.reportsService.getCashPositionReport(this.endDate);
    if (response.success) {
      this.cashPositionReport = response.data;
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

  calculateDenominationTotal() {
    // Calculate coin total
    this.coinTotal =
      (this.denominations.d1000 * 1000) +
      (this.denominations.d500 * 500) +
      (this.denominations.d100 * 100) +
      (this.denominations.d50 * 50) +
      (this.denominations.d20 * 20) +
      (this.denominations.d10 * 10) +
      (this.denominations.d5 * 5) +
      (this.denominations.d1 * 1);

    // Actual total cash is same as coin total
    this.actualTotalCash = this.coinTotal;

    // Calculate variance (actual vs expected)
    if (this.cashPositionReport) {
      this.cashVariance = this.actualTotalCash - this.cashPositionReport.totalCashPosition;
    }
  }

  printCashPosition() {
    window.print();
  }
}
