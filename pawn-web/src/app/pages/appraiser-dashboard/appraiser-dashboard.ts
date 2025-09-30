import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PawnerService } from '../../core/services/pawner.service';
import { ItemService } from '../../core/services/item.service';
import { AddressService } from '../../core/services/address.service';
import { ToastService } from '../../core/services/toast.service';

interface Pawner {
  id?: number;
  firstName: string;
  lastName: string;
  contactNumber: string;
  email?: string;
  cityId?: number;
  barangayId?: number;
  addressDetails?: string;
  cityName?: string;
  barangayName?: string;
}

interface AppraisalItem {
  id?: number;
  pawnerId: number;
  itemType: string;
  brand?: string;
  model?: string;
  description: string;
  estimatedValue: number;
  conditionNotes?: string;
  serialNumber?: string;
  weight?: number;
  karat?: number;
  appraisalNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface City {
  id: number;
  name: string;
}

interface Barangay {
  id: number;
  name: string;
  cityId: number;
}

@Component({
  selector: 'app-appraiser-dashboard',
  templateUrl: './appraiser-dashboard.html',
  styleUrl: './appraiser-dashboard.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class AppraiserDashboard implements OnInit {
  currentDateTime = new Date();
  isLoading = false;

  // Search & Pawner Management
  searchQuery = '';
  searchResults: Pawner[] = [];
  selectedPawner: Pawner | null = null;
  showCreatePawnerForm = false;

  // Cities and Barangays
  cities: City[] = [];
  barangays: Barangay[] = [];
  filteredBarangays: Barangay[] = [];

  // New Pawner Form
  newPawner: Pawner = {
    firstName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    cityId: undefined,
    barangayId: undefined,
    addressDetails: ''
  };

  // Item Appraisal
  showItemForm = false;
  currentItem: AppraisalItem = {
    pawnerId: 0,
    itemType: '',
    brand: '',
    model: '',
    description: '',
    estimatedValue: 0,
    conditionNotes: '',
    serialNumber: '',
    weight: undefined,
    karat: undefined,
    appraisalNotes: '',
    status: 'pending'
  };

  itemTypes = [
    'Jewelry - Gold Ring',
    'Jewelry - Gold Necklace',
    'Jewelry - Gold Bracelet',
    'Jewelry - Gold Earrings',
    'Jewelry - Silver Ring',
    'Jewelry - Silver Necklace',
    'Jewelry - Silver Bracelet',
    'Jewelry - Platinum Ring',
    'Electronics - Mobile Phone',
    'Electronics - Laptop',
    'Electronics - Tablet',
    'Electronics - Smart Watch',
    'Electronics - Camera',
    'Electronics - Gaming Console',
    'Electronics - Television',
    'Home Appliances - Refrigerator',
    'Home Appliances - Washing Machine',
    'Home Appliances - Air Conditioner',
    'Home Appliances - Microwave',
    'Tools - Power Drill',
    'Tools - Generator',
    'Vehicle - Motorcycle',
    'Vehicle - Bicycle',
    'Other'
  ];

  // Recent Appraisals
  recentAppraisals: AppraisalItem[] = [];

  constructor(
    private pawnerService: PawnerService,
    private itemService: ItemService,
    private addressService: AddressService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadCities();
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    this.currentDateTime = new Date();
  }

  // Search Pawners
  searchPawners() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    console.log('Searching pawners:', this.searchQuery);
    this.pawnerService.searchPawners(this.searchQuery).subscribe({
      next: (response) => {
        if (response.success) {
          this.searchResults = response.data;
          console.log(`Found ${this.searchResults.length} pawners`);

          if (this.searchResults.length === 0) {
            this.toastService.showInfo('Search Results', 'No pawners found. You can create a new one.');
          }
        } else {
          this.toastService.showError('Search Error', 'Failed to search pawners');
        }
      },
      error: (error) => {
        console.error('Error searching pawners:', error);
        this.toastService.showError('Search Error', 'Error searching pawners');
      }
    });
  }

  // Select Pawner
  selectPawner(pawner: Pawner) {
    this.selectedPawner = pawner;
    this.searchResults = [];
    this.searchQuery = `${pawner.firstName} ${pawner.lastName} - ${pawner.contactNumber}`;
    this.showCreatePawnerForm = false;
    this.toastService.showSuccess('Pawner Selected', `Selected ${pawner.firstName} ${pawner.lastName}`);
  }

  // Show Create Pawner Form
  showCreateForm() {
    this.showCreatePawnerForm = true;
    this.searchResults = [];
  }

  // Load Cities
  loadCities() {
    this.addressService.getCities().subscribe({
      next: (response) => {
        if (response.success) {
          this.cities = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading cities:', error);
      }
    });
  }

  // Load Barangays when city changes
  onCityChange() {
    if (!this.newPawner.cityId) {
      this.filteredBarangays = [];
      return;
    }

    this.addressService.getBarangaysByCity(this.newPawner.cityId).subscribe({
      next: (response) => {
        if (response.success) {
          this.filteredBarangays = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading barangays:', error);
      }
    });
  }

  // Create New Pawner
  createPawner() {
    if (!this.newPawner.firstName || !this.newPawner.lastName || !this.newPawner.contactNumber) {
      this.toastService.showWarning('Validation Error', 'Please fill in required fields');
      return;
    }

    console.log('Creating new pawner:', this.newPawner);

    const pawnerRequest = {
      firstName: this.newPawner.firstName,
      lastName: this.newPawner.lastName,
      contactNumber: this.newPawner.contactNumber,
      email: this.newPawner.email || '',
      cityId: this.newPawner.cityId || 0,
      barangayId: this.newPawner.barangayId || 0,
      addressDetails: this.newPawner.addressDetails || '',
      isActive: true
    };

    this.pawnerService.createPawner(pawnerRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedPawner = response.data;
          this.searchQuery = `${this.newPawner.firstName} ${this.newPawner.lastName} - ${this.newPawner.contactNumber}`;
          this.showCreatePawnerForm = false;
          this.resetPawnerForm();
          this.toastService.showSuccess('Success', 'Pawner created successfully');
        } else {
          this.toastService.showError('Create Error', response.message || 'Failed to create pawner');
        }
      },
      error: (error) => {
        console.error('Error creating pawner:', error);
        this.toastService.showError('Create Error', 'Error creating pawner');
      }
    });
  }

  // Reset Pawner Form
  resetPawnerForm() {
    this.newPawner = {
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      cityId: undefined,
      barangayId: undefined,
      addressDetails: ''
    };
    this.filteredBarangays = [];
    this.showCreatePawnerForm = false;
  }

  // Show Item Appraisal Form
  startItemAppraisal() {
    if (!this.selectedPawner) {
      this.toastService.showWarning('Validation Error', 'Please select or create a pawner first');
      return;
    }

    this.currentItem = {
      pawnerId: this.selectedPawner.id!,
      itemType: '',
      brand: '',
      model: '',
      description: '',
      estimatedValue: 0,
      conditionNotes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      appraisalNotes: '',
      status: 'pending'
    };
    this.showItemForm = true;
  }

  // Save Item Appraisal
  saveItemAppraisal() {
    if (!this.currentItem.itemType || !this.currentItem.description || !this.currentItem.estimatedValue) {
      this.toastService.showWarning('Validation Error', 'Please fill in required fields');
      return;
    }

    console.log('Saving item appraisal:', this.currentItem);

    // For now, just show success - you can integrate with item creation API
    this.toastService.showSuccess('Success', 'Item appraisal saved successfully');
    this.recentAppraisals.unshift({...this.currentItem, id: Date.now()});
    this.resetItemForm();
  }

  // Reset Item Form
  resetItemForm() {
    this.showItemForm = false;
    this.currentItem = {
      pawnerId: 0,
      itemType: '',
      brand: '',
      model: '',
      description: '',
      estimatedValue: 0,
      conditionNotes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      appraisalNotes: '',
      status: 'pending'
    };
  }

  // Clear Selection
  clearSelection() {
    this.selectedPawner = null;
    this.searchQuery = '';
    this.searchResults = [];
    this.showCreatePawnerForm = false;
    this.showItemForm = false;
  }

  // Format Currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  // Get Item Type Category
  getItemTypeCategory(itemType: string): string {
    if (itemType.toLowerCase().includes('jewelry')) return 'jewelry';
    if (itemType.toLowerCase().includes('electronics')) return 'electronics';
    if (itemType.toLowerCase().includes('appliance')) return 'appliance';
    if (itemType.toLowerCase().includes('vehicle')) return 'vehicle';
    return 'other';
  }

  // Get Item Type Icon
  getItemTypeIcon(itemType: string): string {
    const category = this.getItemTypeCategory(itemType);
    switch (category) {
      case 'jewelry': return '💎';
      case 'electronics': return '📱';
      case 'appliance': return '🏠';
      case 'vehicle': return '🚗';
      default: return '📦';
    }
  }

  // Get Status Badge Class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }
}
