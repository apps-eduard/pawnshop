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
  imports: [CommonModule, RouterModule]
})
export class AuctioneerDashboard implements OnInit {
  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  upcomingAuctions: AuctionItem[] = [];
  auctionStats: AuctionStats = {
    total_auctions: 0,
    active_auctions: 0,
    items_sold: 0,
    total_revenue: 0,
    avg_sale_price: 0,
    success_rate: 0
  };

  ngOnInit() {
    this.loadDashboardData();
    this.updateTime();
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
      },
      {
        title: 'Success Rate',
        count: 87,
        icon: 'success',
        color: 'orange',
        route: '/auctions/statistics'
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
    const colorMap: { [key: string]: string } = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      unsold: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    return colorMap[status] || colorMap['scheduled'];
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
}
