import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../../core/services/item.service';
import { ToastService } from '../../../core/services/toast.service';

interface AuctionItem {
  id: number;
  ticketNumber: string;
  itemDescription: string;
  category: string;
  appraisedValue: number;
  loanAmount: number;
  auctionPrice: number;
  status: 'available' | 'bidding' | 'sold' | 'withdrawn';
  expiredDate: string;
  grantedDate?: string;
  pawnerName: string;
}

@Component({
  selector: 'app-auction-items',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './auction-items.html',
  styleUrl: './auction-items.css'
})
export class AuctionItemsComponent implements OnInit {
  auctionItems: AuctionItem[] = [];
  filteredItems: AuctionItem[] = [];
  isLoading = true;

  // Filter properties
  searchQuery = '';
  selectedCategory = '';
  selectedStatus = '';
  sortBy = 'expiredDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  categories: string[] = ['All'];
  statuses = ['All', 'Available', 'Bidding', 'Sold', 'Withdrawn'];

  constructor(
    private itemService: ItemService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAuctionItems();
  }

  async loadAuctionItems(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.itemService.getAuctionItems();

      if (response.success && response.data) {
        this.auctionItems = response.data.map((item: any) => ({
          id: item.id,
          ticketNumber: item.ticketNumber,
          itemDescription: item.itemDescription,
          category: item.category,
          appraisedValue: item.appraisedValue,
          loanAmount: item.loanAmount,
          auctionPrice: item.auctionPrice,
          status: item.status || 'available',
          expiredDate: item.expiredDate,
          grantedDate: item.grantedDate,
          pawnerName: item.pawnerName
        }));

        // Extract unique categories from the data
        const uniqueCategories = [...new Set(this.auctionItems.map(item => item.category))];
        this.categories = ['All', ...uniqueCategories.sort()];

        this.filteredItems = [...this.auctionItems];
        console.log(`✅ Loaded ${this.auctionItems.length} auction items`);
      } else {
        this.toastService.showError('Error', response.message || 'Failed to load auction items');
        this.auctionItems = [];
        this.filteredItems = [];
      }
    } catch (error) {
      console.error('Error loading auction items:', error);
      this.toastService.showError('Error', 'An error occurred while loading auction items');
      this.auctionItems = [];
      this.filteredItems = [];
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    this.filteredItems = this.auctionItems.filter(item => {
      const matchesSearch = !this.searchQuery ||
        item.itemDescription.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.ticketNumber.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.pawnerName.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCategory = !this.selectedCategory ||
        this.selectedCategory === 'All' ||
        item.category === this.selectedCategory;

      const matchesStatus = !this.selectedStatus ||
        this.selectedStatus === 'All' ||
        item.status === this.selectedStatus.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });

    this.sortItems();
  }

  sortItems(): void {
    this.filteredItems.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'expiredDate':
          comparison = new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime();
          break;
        case 'appraisedValue':
          comparison = a.appraisedValue - b.appraisedValue;
          break;
        case 'auctionPrice':
          comparison = a.auctionPrice - b.auctionPrice;
          break;
        case 'itemDescription':
          comparison = a.itemDescription.localeCompare(b.itemDescription);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.sortItems();
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortItems();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'bidding':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'withdrawn':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(dateObj);
  }

  viewItemDetails(item: AuctionItem): void {
    console.log('View details for item:', item);
    // Implement navigation to item details page
  }

  editItem(item: AuctionItem): void {
    console.log('Edit item:', item);
    // Implement edit functionality
  }

  deleteItem(item: AuctionItem): void {
    if (confirm(`Are you sure you want to remove "${item.itemDescription}" from auction?`)) {
      this.auctionItems = this.auctionItems.filter(i => i.id !== item.id);
      this.applyFilters();
    }
  }

  saleItem(item: AuctionItem): void {
    if (confirm(`Process sale for "${item.itemDescription}"?`)) {
      // Update item status to sold
      item.status = 'sold';

      // Here you would typically call an API to process the sale
      console.log('Processing sale for item:', item);

      // Show success message or navigate to sale processing page
      alert(`Sale processed for "${item.itemDescription}"`);

      // Refresh the filtered items
      this.applyFilters();
    }
  }
}
