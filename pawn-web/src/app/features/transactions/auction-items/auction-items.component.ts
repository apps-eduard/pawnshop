import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../../core/services/item.service';
import { ToastService } from '../../../core/services/toast.service';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';

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
  imports: [CommonModule, RouterModule, FormsModule, CurrencyInputDirective],
  templateUrl: './auction-items.html',
  styleUrl: './auction-items.css'
})
export class AuctionItemsComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('discountInput') discountInput?: ElementRef<HTMLInputElement>;

  auctionItems: AuctionItem[] = [];
  filteredItems: AuctionItem[] = [];
  isLoading = true;
  isRefreshing = false;
  private refreshInterval: any;
  private readonly AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
  private shouldFocusDiscount = false;

  // Filter properties
  searchQuery = '';
  selectedCategory = '';
  selectedStatus = '';
  sortBy = 'expiredDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  categories: string[] = ['All'];
  statuses = ['All', 'Available', 'Bidding', 'Sold', 'Withdrawn'];

  // Sale dialog properties
  showSaleDialog = false;
  selectedSaleItem: AuctionItem | null = null;

  // Buyer search and form
  isNewCustomer = false;
  buyerSearchQuery = '';
  searchResults: any[] = [];
  selectedBuyer: any = null;
  isSearching = false;
  showSearchResults = false;

  buyerFirstName = '';
  buyerLastName = '';
  buyerContact = '';
  saleNotes = '';
  discountAmount: number = 0;
  finalPrice: number = 0;
  receivedAmount: number = 0;
  changeAmount: number = 0;
  isProcessingSale = false;

  constructor(
    private itemService: ItemService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAuctionItems();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusDiscount && this.discountInput) {
      this.discountInput.nativeElement.focus();
      this.shouldFocusDiscount = false;
    }
  }

  startAutoRefresh(): void {
    // Auto-refresh every 30 seconds to keep data synchronized
    this.refreshInterval = setInterval(() => {
      this.refreshAuctionItems();
    }, this.AUTO_REFRESH_INTERVAL);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async loadAuctionItems(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.itemService.getAuctionItems();

      if (response.success && response.data) {
        this.auctionItems = response.data.map((item: any) => ({
          id: item.id,
          ticketNumber: item.ticketNumber,
          itemDescription: item.itemDescription || item.descriptionName || item.category || 'Item',
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

  async refreshAuctionItems(): Promise<void> {
    // Manual refresh - doesn't show loading spinner, only refresh indicator
    this.isRefreshing = true;

    try {
      const response = await this.itemService.getAuctionItems();

      if (response.success && response.data) {
        const previousCount = this.auctionItems.length;

        this.auctionItems = response.data.map((item: any) => ({
          id: item.id,
          ticketNumber: item.ticketNumber,
          itemDescription: item.itemDescription || item.descriptionName || item.category || 'Item',
          category: item.category,
          appraisedValue: item.appraisedValue,
          loanAmount: item.loanAmount,
          auctionPrice: item.auctionPrice,
          status: item.status || 'available',
          expiredDate: item.expiredDate,
          grantedDate: item.grantedDate,
          pawnerName: item.pawnerName
        }));

        // Update categories
        const uniqueCategories = [...new Set(this.auctionItems.map(item => item.category))];
        this.categories = ['All', ...uniqueCategories.sort()];

        this.filteredItems = [...this.auctionItems];

        // Show notification if items changed
        const newCount = this.auctionItems.length;
        if (newCount !== previousCount) {
          const diff = newCount - previousCount;
          if (diff > 0) {
            this.toastService.showInfo('List Updated', `${diff} new item(s) added to auction`);
          } else {
            this.toastService.showWarning('List Updated', `${Math.abs(diff)} item(s) removed from auction`);
          }
        }

        console.log(`🔄 Refreshed: ${this.auctionItems.length} auction items`);
      }
    } catch (error) {
      console.error('Error refreshing auction items:', error);
      // Don't show error toast for background refresh
    } finally {
      this.isRefreshing = false;
    }
  }

  manualRefresh(): void {
    // User clicked refresh button
    this.toastService.showInfo('Refreshing', 'Updating auction items list...');
    this.refreshAuctionItems();
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

  async saleItem(item: AuctionItem): Promise<void> {
    // First, verify the item is still available for auction
    try {
      // Re-fetch the specific item to check current status
      const response = await this.itemService.validateAuctionItem(item.id);

      if (!response.success) {
        this.toastService.showError(
          'Item Not Available',
          response.message || 'This item is no longer available for auction.'
        );
        // Remove from local list
        this.auctionItems = this.auctionItems.filter(i => i.id !== item.id);
        this.applyFilters();
        return;
      }
    } catch (error) {
      console.error('Error verifying item availability:', error);
      this.toastService.showError(
        'Verification Failed',
        'Could not verify item availability. Please try again.'
      );
      return;
    }

    // Open sale dialog
    this.selectedSaleItem = item;
    this.isNewCustomer = false;
    this.buyerSearchQuery = '';
    this.searchResults = [];
    this.selectedBuyer = null;
    this.showSearchResults = false;
    this.buyerFirstName = '';
    this.buyerLastName = '';
    this.buyerContact = '';
    this.saleNotes = '';
    this.discountAmount = 0;
    this.finalPrice = item.auctionPrice;
    this.receivedAmount = 0;
    this.changeAmount = 0;
    this.showSaleDialog = true;
    this.shouldFocusDiscount = true;
  }

  closeSaleDialog(): void {
    this.showSaleDialog = false;
    this.selectedSaleItem = null;
    this.isNewCustomer = false;
    this.buyerSearchQuery = '';
    this.searchResults = [];
    this.selectedBuyer = null;
    this.showSearchResults = false;
    this.buyerFirstName = '';
    this.buyerLastName = '';
    this.buyerContact = '';
    this.saleNotes = '';
    this.discountAmount = 0;
    this.finalPrice = 0;
    this.receivedAmount = 0;
    this.changeAmount = 0;
    this.isProcessingSale = false;
  }

  calculateFinalPrice(): void {
    if (!this.selectedSaleItem) return;

    const discount = this.discountAmount || 0;
    const auctionPrice = this.selectedSaleItem.auctionPrice;

    // Ensure discount doesn't exceed auction price
    if (discount > auctionPrice) {
      this.discountAmount = auctionPrice;
      this.finalPrice = 0;
    } else if (discount < 0) {
      this.discountAmount = 0;
      this.finalPrice = auctionPrice;
    } else {
      this.finalPrice = auctionPrice - discount;
    }

    // Recalculate change when final price changes
    this.calculateChange();
  }

  calculateChange(): void {
    const received = this.receivedAmount || 0;
    const change = received - this.finalPrice;
    this.changeAmount = change >= 0 ? change : 0;
  }

  async confirmSale(): Promise<void> {
    // Validate buyer information
    if (!this.isNewCustomer && !this.selectedBuyer) {
      this.toastService.showWarning('Validation Error', 'Please select or add a buyer');
      return;
    }

    if (this.isNewCustomer) {
      if (!this.buyerFirstName.trim() || !this.buyerLastName.trim()) {
        this.toastService.showWarning('Validation Error', 'Please enter buyer first name and last name');
        return;
      }
    }

    this.isProcessingSale = true;

    try {
      // Prepare sale data
      const saleData = {
        itemId: this.selectedSaleItem!.id,
        buyerId: this.isNewCustomer ? null : this.selectedBuyer.id,
        buyerFirstName: this.isNewCustomer ? this.buyerFirstName.trim() : this.selectedBuyer.first_name,
        buyerLastName: this.isNewCustomer ? this.buyerLastName.trim() : this.selectedBuyer.last_name,
        buyerContact: this.isNewCustomer ? this.buyerContact : this.selectedBuyer.mobile_number,
        saleNotes: this.saleNotes || undefined,
        discountAmount: this.discountAmount || 0,
        finalPrice: this.finalPrice,
        receivedAmount: this.receivedAmount || 0
      };

      console.log('Processing sale:', saleData);

      // Call API to save the sale
      const response = await this.itemService.confirmAuctionSale(saleData);

      if (!response.success) {
        this.toastService.showError('Sale Failed', response.message);
        return;
      }

      // Update item status in local list
      const itemIndex = this.auctionItems.findIndex(i => i.id === this.selectedSaleItem!.id);
      if (itemIndex !== -1) {
        this.auctionItems.splice(itemIndex, 1); // Remove from auction list since it's sold
      }

      // Build success message
      const buyerName = this.isNewCustomer
        ? `${this.buyerFirstName} ${this.buyerLastName}`
        : `${this.selectedBuyer?.first_name} ${this.selectedBuyer?.last_name}`;

      let successMessage = `Successfully sold "${this.selectedSaleItem?.itemDescription}" to ${buyerName}`;
      if (this.discountAmount > 0) {
        successMessage += ` with ₱${this.discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} discount`;
      }
      if (this.receivedAmount > 0) {
        successMessage += `. Change: ₱${this.changeAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      this.toastService.showSuccess(
        'Sale Completed',
        successMessage
      );

      // Close dialog
      this.closeSaleDialog();

      // Refresh the list to ensure sync with database
      await this.refreshAuctionItems();
    } catch (error) {
      console.error('Error processing sale:', error);
      this.toastService.showError(
        'Sale Failed',
        'An error occurred while processing the sale. Please try again.'
      );
    } finally {
      this.isProcessingSale = false;
    }
  }

  // Buyer search methods
  async searchBuyers(): Promise<void> {
    const query = this.buyerSearchQuery.trim();
    if (!query || query.length < 2) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    this.isSearching = true;
    this.showSearchResults = true;

    try {
      // Call API to search pawners by name or contact
      const response = await this.itemService.searchPawners(query);
      this.searchResults = response.data || [];
    } catch (error) {
      console.error('Error searching buyers:', error);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  selectBuyer(buyer: any): void {
    this.selectedBuyer = buyer;
    this.buyerSearchQuery = `${buyer.first_name} ${buyer.last_name}`;
    this.showSearchResults = false;
    this.buyerContact = buyer.mobile_number || '';
  }

  showNewCustomerForm(): void {
    this.isNewCustomer = true;
    this.buyerSearchQuery = '';
    this.searchResults = [];
    this.selectedBuyer = null;
    this.showSearchResults = false;
    this.buyerFirstName = '';
    this.buyerLastName = '';
    this.buyerContact = '';
  }

  cancelNewCustomer(): void {
    this.isNewCustomer = false;
    this.buyerFirstName = '';
    this.buyerLastName = '';
    this.buyerContact = '';
  }
}
