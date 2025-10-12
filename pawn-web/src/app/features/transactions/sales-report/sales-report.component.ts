import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../../core/services/item.service';
import { ToastService } from '../../../core/services/toast.service';

interface SoldItem {
  id: number;
  ticketNumber: string;
  itemDescription: string;
  category: string;
  pawnerName: string;
  pawnerContact: string;
  buyerId: number;
  buyerCode: string;
  buyerName: string;
  buyerContact: string;
  appraisedValue: number;
  loanAmount: number;
  auctionPrice: number;
  discountAmount: number;
  finalPrice: number;
  receivedAmount: number;
  soldDate: string;
  saleNotes: string;
  soldBy: string;
  grantedDate: string;
  expiredDate: string;
}

interface SalesSummary {
  totalItems: number;
  totalSales: number;
  totalDiscount: number;
  totalReceived: number;
  averagePrice: number;
}

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.css'
})
export class SalesReportComponent implements OnInit {
  soldItems: SoldItem[] = [];
  filteredItems: SoldItem[] = [];
  summary: SalesSummary = {
    totalItems: 0,
    totalSales: 0,
    totalDiscount: 0,
    totalReceived: 0,
    averagePrice: 0
  };

  isLoading = false;
  selectedPeriod: 'today' | 'month' | 'year' | 'custom' = 'today';
  startDate = '';
  endDate = '';
  searchQuery = '';

  // View mode
  viewMode: 'grid' | 'list' = 'list';

  constructor(
    private itemService: ItemService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSoldItems();
  }

  async loadSoldItems(): Promise<void> {
    this.isLoading = true;

    try {
      const params: any = {};

      if (this.selectedPeriod === 'custom' && this.startDate && this.endDate) {
        params.startDate = this.startDate;
        params.endDate = this.endDate;
      } else if (this.selectedPeriod !== 'custom') {
        params.period = this.selectedPeriod;
      }

      const response = await this.itemService.getSoldItems(params);

      if (response.success && response.data) {
        this.soldItems = response.data.items || [];
        this.summary = response.data.summary || this.summary;
        this.applySearch();
      } else {
        this.toastService.showError('Error', response.message || 'Failed to load sold items');
      }
    } catch (error) {
      console.error('Error loading sold items:', error);
      this.toastService.showError('Error', 'An error occurred while loading sold items');
    } finally {
      this.isLoading = false;
    }
  }

  onPeriodChange(period: 'today' | 'month' | 'year' | 'custom'): void {
    this.selectedPeriod = period;
    if (period !== 'custom') {
      this.loadSoldItems();
    }
  }

  onCustomDateApply(): void {
    if (!this.startDate || !this.endDate) {
      this.toastService.showWarning('Validation', 'Please select both start and end dates');
      return;
    }

    if (new Date(this.startDate) > new Date(this.endDate)) {
      this.toastService.showWarning('Validation', 'Start date must be before end date');
      return;
    }

    this.loadSoldItems();
  }

  applySearch(): void {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredItems = [...this.soldItems];
      return;
    }

    this.filteredItems = this.soldItems.filter(item =>
      item.ticketNumber.toLowerCase().includes(query) ||
      item.itemDescription.toLowerCase().includes(query) ||
      item.buyerName.toLowerCase().includes(query) ||
      item.buyerCode.toLowerCase().includes(query) ||
      item.pawnerName.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }

  exportToCSV(): void {
    const headers = [
      'Date',
      'Ticket #',
      'Item',
      'Category',
      'Pawner',
      'Buyer',
      'Buyer Code',
      'Auction Price',
      'Discount',
      'Final Price',
      'Received',
      'Sold By'
    ];

    const rows = this.filteredItems.map(item => [
      item.soldDate,
      item.ticketNumber,
      item.itemDescription,
      item.category,
      item.pawnerName,
      item.buyerName,
      item.buyerCode,
      item.auctionPrice.toFixed(2),
      item.discountAmount.toFixed(2),
      item.finalPrice.toFixed(2),
      item.receivedAmount.toFixed(2),
      item.soldBy
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${this.selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toastService.showSuccess('Export', 'Sales report exported successfully');
  }

  printReport(): void {
    window.print();
  }
}
