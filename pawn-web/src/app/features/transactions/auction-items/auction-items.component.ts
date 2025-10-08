import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface AuctionItem {
  id: number;
  ticketNumber: string;
  itemDescription: string;
  category: string;
  appraisedValue: number;
  startingBid: number;
  currentBid?: number;
  status: 'available' | 'bidding' | 'sold' | 'withdrawn';
  dateAdded: Date;
  auctionDate?: Date;
  pawnerName: string;
  images?: string[];
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
  sortBy = 'dateAdded';
  sortDirection: 'asc' | 'desc' = 'desc';

  categories = ['All', 'Jewelry', 'Electronics', 'Watches', 'Vehicles', 'Appliances', 'Others'];
  statuses = ['All', 'Available', 'Bidding', 'Sold', 'Withdrawn'];

  ngOnInit(): void {
    this.loadAuctionItems();
  }

  loadAuctionItems(): void {
    this.isLoading = true;

    // Mock data - replace with actual API call
    setTimeout(() => {
      this.auctionItems = [
        {
          id: 1,
          ticketNumber: 'TKT-2025-001',
          itemDescription: 'Gold Ring 14K with Diamond',
          category: 'Jewelry',
          appraisedValue: 25000,
          startingBid: 20000,
          currentBid: 22000,
          status: 'bidding',
          dateAdded: new Date('2025-10-05'),
          auctionDate: new Date('2025-10-15'),
          pawnerName: 'Juan Dela Cruz'
        },
        {
          id: 2,
          ticketNumber: 'TKT-2025-002',
          itemDescription: 'Samsung Galaxy S23 Ultra',
          category: 'Electronics',
          appraisedValue: 35000,
          startingBid: 28000,
          status: 'available',
          dateAdded: new Date('2025-10-06'),
          pawnerName: 'Maria Santos'
        },
        {
          id: 3,
          ticketNumber: 'TKT-2025-003',
          itemDescription: 'Rolex Submariner Watch',
          category: 'Watches',
          appraisedValue: 150000,
          startingBid: 120000,
          currentBid: 135000,
          status: 'sold',
          dateAdded: new Date('2025-10-03'),
          auctionDate: new Date('2025-10-08'),
          pawnerName: 'Pedro Garcia'
        },
        {
          id: 4,
          ticketNumber: 'TKT-2025-004',
          itemDescription: 'Honda Motorcycle CBR 150R',
          category: 'Vehicles',
          appraisedValue: 80000,
          startingBid: 65000,
          status: 'available',
          dateAdded: new Date('2025-10-07'),
          pawnerName: 'Ana Rodriguez'
        },
        {
          id: 5,
          ticketNumber: 'TKT-2025-005',
          itemDescription: 'LG Refrigerator 2-Door',
          category: 'Appliances',
          appraisedValue: 20000,
          startingBid: 16000,
          status: 'withdrawn',
          dateAdded: new Date('2025-10-02'),
          pawnerName: 'Carlos Miguel'
        }
      ];

      this.filteredItems = [...this.auctionItems];
      this.isLoading = false;
    }, 1000);
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
        case 'dateAdded':
          comparison = a.dateAdded.getTime() - b.dateAdded.getTime();
          break;
        case 'appraisedValue':
          comparison = a.appraisedValue - b.appraisedValue;
          break;
        case 'startingBid':
          comparison = a.startingBid - b.startingBid;
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

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(date);
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
