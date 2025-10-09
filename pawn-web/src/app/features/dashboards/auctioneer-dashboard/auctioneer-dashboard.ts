import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { StatusColorService } from '../../../core/services/status-color.service';
import { ToastService } from '../../../core/services/toast.service';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';

interface DashboardCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  route: string;
  amount?: number;
}

interface AuctionItem {
  id: string;
  loan_id: string;
  item_description: string;
  starting_bid: number;
  current_bid?: number;
  reserve_price: number;
  auction_date: Date;
  status: 'scheduled' | 'active' | 'sold' | 'unsold';
  bidders_count: number;
  item_type: 'jewelry' | 'appliance' | 'electronics' | 'vehicle';
}

interface ExpiredItem {
  id: number;
  transactionId?: number;
  ticketNumber: string;
  trackingNumber?: string;
  loanId: string;
  itemDescription: string;
  pawnerName: string;
  appraisedValue: number;
  loanAmount: number;
  currentPrincipal?: number;
  expiredDate: Date;
  category: string;
  auctionPrice?: number;
  isSetForAuction?: boolean;
  showHistory?: boolean;
  transactionHistory?: TransactionHistoryItem[];
  loadingHistory?: boolean;
}

interface TransactionHistoryItem {
  id: number;
  transactionNumber: string;
  transactionType: string;
  transactionDate: Date;
  maturityDate?: Date;
  expiryDate?: Date;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  serviceCharge: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  discountAmount?: number;
  advanceInterest?: number;
  newPrincipalLoan?: number;
  status: string;
  notes?: string;
}

interface AuctionStats {
  total_auctions: number;
  active_auctions: number;
  items_sold: number;
  total_revenue: number;
  avg_sale_price: number;
  success_rate: number;
}

@Component({
  selector: 'app-auctioneer-dashboard',
  templateUrl: './auctioneer-dashboard.html',
  styleUrl: './auctioneer-dashboard.css',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyInputDirective]
})
export class AuctioneerDashboard implements OnInit, AfterViewChecked {
  @ViewChild('auctionPriceInput') auctionPriceInput?: ElementRef<HTMLInputElement>;
  
  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  upcomingAuctions: AuctionItem[] = [];
  expiredItems: ExpiredItem[] = [];
  showPriceModal = false;
  selectedExpiredItem: ExpiredItem | null = null;
  tempAuctionPrice = '';
  private shouldFocusInput = false;
  auctionStats: AuctionStats = {
    total_auctions: 0,
    active_auctions: 0,
    items_sold: 0,
    total_revenue: 0,
    avg_sale_price: 0,
    success_rate: 0
  };

  constructor(
    public statusColorService: StatusColorService,
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.loadExpiredItems();
    this.updateTime();
  }

  ngAfterViewChecked() {
    // Auto-focus the input when modal opens
    if (this.shouldFocusInput && this.auctionPriceInput) {
      this.auctionPriceInput.nativeElement.focus();
      this.shouldFocusInput = false;
    }
  }

  private loadDashboardData() {
    this.isLoading = true;

    // Mock dashboard data for Auctioneer
    this.dashboardCards = [
      {
        title: 'Active Auctions',
        count: 8,
        icon: 'active',
        color: 'green',
        route: '/auctions/active'
      },
      {
        title: 'Scheduled Items',
        count: 34,
        icon: 'scheduled',
        color: 'blue',
        route: '/auctions/scheduled',
        amount: 850000
      },
      {
        title: 'Items Sold Today',
        count: 12,
        icon: 'sold',
        color: 'purple',
        route: '/auctions/sold',
        amount: 420000
      }
    ];

    // Mock upcoming auctions
    this.upcomingAuctions = [
      {
        id: 'AUC001',
        loan_id: 'L2024001',
        item_description: 'Gold necklace with diamonds',
        starting_bid: 45000,
        current_bid: 52000,
        reserve_price: 50000,
        auction_date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        status: 'scheduled',
        bidders_count: 5,
        item_type: 'jewelry'
      },
      {
        id: 'AUC002',
        loan_id: 'L2024002',
        item_description: 'Samsung 65" QLED TV',
        starting_bid: 25000,
        reserve_price: 30000,
        auction_date: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        status: 'scheduled',
        bidders_count: 0,
        item_type: 'appliance'
      },
      {
        id: 'AUC003',
        loan_id: 'L2024003',
        item_description: 'MacBook Pro 16" M3',
        starting_bid: 35000,
        current_bid: 41000,
        reserve_price: 40000,
        auction_date: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        status: 'active',
        bidders_count: 8,
        item_type: 'electronics'
      },
      {
        id: 'AUC004',
        loan_id: 'L2024004',
        item_description: 'Toyota Vios 2020',
        starting_bid: 450000,
        reserve_price: 500000,
        auction_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'scheduled',
        bidders_count: 0,
        item_type: 'vehicle'
      }
    ];

    // Mock auction stats
    this.auctionStats = {
      total_auctions: 156,
      active_auctions: 8,
      items_sold: 134,
      total_revenue: 4250000,
      avg_sale_price: 31716,
      success_rate: 87.2
    };

    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  private updateTime() {
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000);
  }

  private async loadExpiredItems(): Promise<void> {
    try {
      console.log('🔄 Loading expired items from database...');
      const apiUrl = 'http://localhost:3000/api/items/expired';

      const response = await this.http.get<any>(apiUrl).toPromise();

      console.log('📦 Raw API Response:', response);

      if (response && response.success && response.data) {
        console.log('📦 Expired items data:', response.data);

      this.expiredItems = response.data.map((item: any) => ({
        id: item.id,
        transactionId: item.transactionId || item.transaction_id,
        ticketNumber: item.ticketNumber || item.ticket_number || 'N/A',
        trackingNumber: item.trackingNumber || item.tracking_number || item.ticketNumber || item.ticket_number,
        loanId: item.loanId || item.loan_id || '',
        itemDescription: item.itemDescription || item.item_description || item.description || `Item #${item.id}`,
        pawnerName: item.pawnerName || item.pawner_name || 'Unknown',
        appraisedValue: item.appraisedValue || item.appraised_value || item.appraisal_value || 0,
        loanAmount: item.loanAmount || item.loan_amount || item.principal_amount || 0,
        currentPrincipal: item.currentPrincipal || item.current_principal || item.principal_amount || 0,
        expiredDate: new Date(item.expiredDate || item.expired_date || item.expiry_date),
        category: item.category || 'Uncategorized',
        auctionPrice: item.auctionPrice || item.auction_price || undefined,
        isSetForAuction: item.isSetForAuction || item.is_set_for_auction || false,
        showHistory: false,
        transactionHistory: [],
        loadingHistory: false
      }));        console.log(`✅ Successfully loaded ${this.expiredItems.length} expired items`);
        console.log('📦 Mapped expired items:', this.expiredItems);
      } else {
        console.warn('⚠️ No expired items data in response');
        this.expiredItems = [];
      }
    } catch (error: any) {
      console.error('❌ Error loading expired items:', error);
      console.error('❌ Error details:', error?.error || error?.message || error);
      this.expiredItems = [];
    }
  }



  openPriceModal(item: ExpiredItem): void {
    this.selectedExpiredItem = item;
    this.tempAuctionPrice = item.auctionPrice?.toString() || '';
    this.showPriceModal = true;
    this.shouldFocusInput = true; // Flag to focus input after view is rendered
  }

  closePriceModal(): void {
    this.showPriceModal = false;
    this.selectedExpiredItem = null;
    this.tempAuctionPrice = '';
    this.shouldFocusInput = false;
  }

  async toggleTransactionHistory(item: ExpiredItem): Promise<void> {
    // Toggle the display
    item.showHistory = !item.showHistory;

    // If showing and history not yet loaded, fetch it
    if (item.showHistory && (!item.transactionHistory || item.transactionHistory.length === 0)) {
      await this.loadTransactionHistory(item);
    }
  }

  async loadTransactionHistory(item: ExpiredItem): Promise<void> {
    try {
      item.loadingHistory = true;
      console.log(`📜 Loading transaction history for item ${item.id}...`);

      const apiUrl = `http://localhost:3000/api/items/expired/${item.id}/history`;
      const response = await this.http.get<any>(apiUrl).toPromise();

      if (response && response.success && response.data) {
        item.transactionHistory = response.data.history.map((tx: any) => ({
          id: tx.id,
          transactionNumber: tx.transactionNumber,
          transactionType: tx.transactionType,
          transactionDate: new Date(tx.transactionDate),
          maturityDate: tx.maturityDate ? new Date(tx.maturityDate) : undefined,
          expiryDate: tx.expiryDate ? new Date(tx.expiryDate) : undefined,
          principalAmount: tx.principalAmount,
          interestRate: tx.interestRate,
          interestAmount: tx.interestAmount,
          serviceCharge: tx.serviceCharge,
          totalAmount: tx.totalAmount,
          amountPaid: tx.amountPaid,
          balance: tx.balance,
          discountAmount: tx.discountAmount,
          advanceInterest: tx.advanceInterest,
          newPrincipalLoan: tx.newPrincipalLoan,
          status: tx.status,
          notes: tx.notes
        }));
        console.log(`✅ Loaded ${item.transactionHistory?.length} transactions for item ${item.id}`);
      }
    } catch (error: any) {
      console.error('❌ Error loading transaction history:', error);
      item.transactionHistory = [];
    } finally {
      item.loadingHistory = false;
    }
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'new_loan': 'New Loan',
      'renewal': 'Renewal',
      'partial_payment': 'Partial Payment',
      'full_payment': 'Full Payment',
      'redemption': 'Redemption',
      'additional_loan': 'Additional Loan'
    };
    return labels[type] || type;
  }

  getTransactionTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'new_loan': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'renewal': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'partial_payment': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'full_payment': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'redemption': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'additional_loan': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  async setAuctionPrice(): Promise<void> {
    if (this.selectedExpiredItem && this.tempAuctionPrice) {
      const price = parseFloat(this.tempAuctionPrice);
      if (price > 0) {
        try {
          console.log(`💰 Setting auction price for item ${this.selectedExpiredItem.id}: ₱${price}`);

          const apiUrl = 'http://localhost:3000/api/items/set-auction-price';
          const payload = {
            itemId: this.selectedExpiredItem.id,
            auctionPrice: price
          };

          const response = await this.http.post<any>(apiUrl, payload).toPromise();

          console.log('✅ Auction price set response:', response);

          if (response && response.success) {
            // Store item description before updating
            const itemDescription = this.selectedExpiredItem!.itemDescription;
            const priceFormatted = price.toLocaleString();
            
            // Update local data on successful save
            this.selectedExpiredItem!.auctionPrice = price;
            this.selectedExpiredItem!.isSetForAuction = true;

            console.log(`✅ Auction price set successfully for ${itemDescription}: ₱${priceFormatted}`);
            this.closePriceModal();

            // Reload expired items to get updated data
            await this.loadExpiredItems();

            // Show success toast
            this.toastService.showSuccess(
              'Auction Price Set',
              `Price set to ₱${priceFormatted} for "${itemDescription}"`
            );
          } else {
            console.error('❌ Failed to set auction price:', response?.message);
            this.toastService.showError(
              'Failed to Set Price',
              response?.message || 'An error occurred. Please try again.'
            );
          }
        } catch (error: any) {
          console.error('❌ Error setting auction price:', error);
          console.error('❌ Error details:', error?.error || error?.message || error);
          this.toastService.showError(
            'Failed to Set Price',
            'An error occurred. Please try again.'
          );
        }
      }
    }
  }

  async removeAuctionPrice(item: ExpiredItem): Promise<void> {
    // Create a detailed confirmation message
    const priceDisplay = item.auctionPrice ? `₱${item.auctionPrice.toLocaleString()}` : 'Not Set';
    const itemInfo = `Item: ${item.itemDescription}\nCurrent Auction Price: ${priceDisplay}`;
    const warning = `\n\n⚠️ Warning: This action will:\n• Remove the auction price\n• Return the item to "Pending" status\n• Remove it from the auction list\n\nAre you sure you want to proceed?`;
    const confirmMessage = itemInfo + warning;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`🚫 Removing auction price for item ${item.id}...`);
      
      const apiUrl = 'http://localhost:3000/api/items/remove-auction-price';
      const payload = { itemId: item.id };

      const response = await this.http.post<any>(apiUrl, payload).toPromise();

      if (response && response.success) {
        console.log(`✅ Auction price removed successfully for item ${item.id}`);

        // Update local data
        item.auctionPrice = undefined;
        item.isSetForAuction = false;

        // Reload expired items to get fresh data
        await this.loadExpiredItems();

        // Show success toast
        this.toastService.showSuccess(
          'Auction Price Removed',
          `"${item.itemDescription}" has been returned to Pending status.`
        );
      } else {
        console.error('❌ Failed to remove auction price:', response?.message);
        this.toastService.showError(
          'Failed to Remove Price',
          response?.message || 'An error occurred. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error removing auction price:', error);
      this.toastService.showError(
        'Failed to Remove Price',
        'An error occurred. Please try again.'
      );
    }
  }

  parseFloat(value: string): number {
    return parseFloat(value);
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
      yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
    };

    return colorMap[color] || colorMap['blue'];
  }

  getItemTypeIcon(itemType: string): string {
    const iconMap: { [key: string]: string } = {
      jewelry: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      appliance: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      electronics: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
      vehicle: 'M19 7h1l1 3v5h-2a2 2 0 11-4 0H9a2 2 0 11-4 0H3v-5l1-3h1m0 0h14V4a1 1 0 00-1-1H6a1 1 0 00-1 1v3z'
    };

    return iconMap[itemType] || iconMap['jewelry'];
  }

  getStatusColor(status: string): string {
    return this.statusColorService.getStatusColor(status);
  }

  getTimeUntilAuction(auctionDate: Date): string {
    const now = new Date();
    const diffMs = auctionDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Now';
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day(s)`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    } else {
      return `${diffMins} min(s)`;
    }
  }

  startAuction(auction: AuctionItem) {
    // TODO: Implement start auction logic
    console.log('Starting auction:', auction.id);
  }

  endAuction(auction: AuctionItem) {
    // TODO: Implement end auction logic
    console.log('Ending auction:', auction.id);
  }

  viewBidders(auction: AuctionItem) {
    // TODO: Implement view bidders logic
    console.log('Viewing bidders for auction:', auction.id);
  }

  /**
   * Calculate how many days an item has been expired
   * @param expiredDate The date the item expired
   * @returns Formatted string showing days expired
   */
  getDaysExpired(expiredDate: Date): string {
    const now = new Date();
    const expired = new Date(expiredDate);

    // Clear time components for accurate day calculation
    now.setHours(0, 0, 0, 0);
    expired.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - expired.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Expired today';
    } else if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 60) {
      return 'Over 1 month ago';
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
}
