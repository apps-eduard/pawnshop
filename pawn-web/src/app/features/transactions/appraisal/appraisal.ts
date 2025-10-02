import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PawnerService } from '../../../core/services/pawner.service';
import { ItemService } from '../../../core/services/item.service';
import { AddressService } from '../../../core/services/address.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { AppraisalService } from '../../../core/services/appraisal.service';
import { Subject, takeUntil } from 'rxjs';
import { ApiResponse } from '../../../core/models/interfaces';

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
  city?: string;
  barangay?: string;
}

interface AppraisalItem {
  id?: number;
  pawnerId?: number;
  category: string;
  categoryDescription: string;
  description: string;
  appraised_value: number;
  serialNumber?: string;
  notes?: string;
  weight?: number;
  karat?: number;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: Date | string;
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
  selector: 'app-appraisal',
  imports: [CommonModule, FormsModule],
  templateUrl: './appraisal.html',
  styleUrl: './appraisal.css'
})
export class Appraisal implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Search functionality
  searchQuery: string = '';
  isSearching: boolean = false;
  pawners: Pawner[] = [];
  selectedPawner: Pawner | null = null;

  // Pawner creation form
  pawnerForm: any = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    city: '',
    barangay: '',
    address: ''
  };

  // Address data
  cities: City[] = [];
  barangays: Barangay[] = [];
  filteredBarangays: Barangay[] = [];

  // Categories and Items
  categories: Category[] = [];
  categoryDescriptions: string[] = [];
  isLoadingDescriptions: boolean = false;
  appraisalItems: AppraisalItem[] = [];
  itemForm: any = {
    category: '',
    categoryDescription: '',
    description: '',
    appraised_value: 0
  };

  constructor(
    private http: HttpClient,
    private pawnerService: PawnerService,
    private itemService: ItemService,
    private addressService: AddressService,
    private toastService: ToastService,
    private categoriesService: CategoriesService,
    private appraisalService: AppraisalService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData() {
    this.loadCategories();
    this.loadAddresses();
    this.loadCategoryDescriptions();
  }

  private loadCategories() {
    this.categoriesService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Category[]>) => {
          this.categories = response.data || [];
          console.log('Categories loaded:', this.categories.length);
        },
        error: (error) => {
          console.error('Failed to load categories:', error);
          this.toastService.showError('Error', 'Failed to load categories');
        }
      });
  }

  private loadCategoryDescriptions() {
    // Initialize as empty - will be loaded when category is selected
    this.categoryDescriptions = [];
  }

  // Load category descriptions based on selected category
  private loadCategoryDescriptionsForCategory(categoryId: number) {
    this.isLoadingDescriptions = true;
    this.categoriesService.getCategoryDescriptions(categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<any[]>) => {
          this.categoryDescriptions = response.data?.map(desc => desc.description) || [];
          console.log(`Category descriptions loaded for category ${categoryId}:`, this.categoryDescriptions.length);
          this.isLoadingDescriptions = false;
        },
        error: (error) => {
          console.error('Failed to load category descriptions:', error);
          this.toastService.showError('Error', 'Failed to load category descriptions');
          // Fallback to empty array
          this.categoryDescriptions = [];
          this.isLoadingDescriptions = false;
        }
      });
  }

  private loadAddresses() {
    this.addressService.getCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<City[]>) => {
          this.cities = response.data || [];
          console.log('Cities loaded:', this.cities.length);
        },
        error: (error) => {
          console.error('Failed to load cities:', error);
        }
      });

    this.addressService.getBarangays()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Barangay[]>) => {
          this.barangays = response.data || [];
          console.log('Barangays loaded:', this.barangays.length);
        },
        error: (error) => {
          console.error('Failed to load barangays:', error);
        }
      });
  }



  // Search functionality - only search after 3 characters
  searchPawners() {
    if (!this.searchQuery.trim() || this.searchQuery.trim().length < 3) {
      this.pawners = [];
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    this.pawnerService.searchPawners(this.searchQuery)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Pawner[]>) => {
          this.pawners = response.data || [];
          this.isSearching = false;
        },
        error: (error) => {
          console.error('Search failed:', error);
          this.isSearching = false;
        }
      });
  }

  // Auto-search as user types
  onSearchInput() {
    if (this.searchQuery.trim().length >= 3) {
      this.searchPawners();
    } else {
      this.pawners = [];
      this.isSearching = false;
    }
  }

  selectPawner(pawner: Pawner) {
    this.selectedPawner = pawner;
    this.populatePawnerForm(pawner);
    this.pawners = [];
    this.searchQuery = '';
  }

  private populatePawnerForm(pawner: Pawner) {
    this.pawnerForm = {
      first_name: pawner.firstName,
      last_name: pawner.lastName,
      phone: pawner.contactNumber,
      email: pawner.email || '',
      city: pawner.city || pawner.cityName || '',
      barangay: pawner.barangay || pawner.barangayName || '',
      address: pawner.addressDetails || ''
    };
  }

  changePawner() {
    this.selectedPawner = null;
    this.resetPawnerForm();
    this.searchQuery = '';
  }

  private resetPawnerForm() {
    this.pawnerForm = {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      city: '',
      barangay: '',
      address: ''
    };
  }

  // City/Barangay filtering
  onCityChange() {
    const selectedCity = this.cities.find(city => city.name === this.pawnerForm.city);
    if (selectedCity) {
      this.filteredBarangays = this.barangays.filter(barangay => barangay.cityId === selectedCity.id);
      this.pawnerForm.barangay = ''; // Reset barangay selection
    } else {
      this.filteredBarangays = [];
    }
  }

  formatContactNumber() {
    // Basic phone number formatting logic can be added here
  }

  // Category change handler
  onCategoryChange() {
    // Reset category description when category changes  
    this.itemForm.categoryDescription = '';
    this.categoryDescriptions = [];

    if (this.itemForm.category) {
      // Find the selected category to get its ID
      const selectedCategory = this.categories.find(cat => cat.name === this.itemForm.category);
      if (selectedCategory) {
        console.log('Loading descriptions for category:', selectedCategory.name, 'ID:', selectedCategory.id);
        this.loadCategoryDescriptionsForCategory(selectedCategory.id);
      }
    }
  }

  // Item management
  addItemToAppraisal() {
    if (!this.itemForm.category || !this.itemForm.categoryDescription || !this.itemForm.appraised_value) {
      this.toastService.showError('Error', 'Please fill in all required item fields');
      return;
    }

    const categoryData = this.categories.find(cat => cat.name === this.itemForm.category);
    
    const newItem: AppraisalItem = {
      category: this.itemForm.category,
      categoryDescription: this.itemForm.categoryDescription,
      description: this.itemForm.description,
      appraised_value: this.itemForm.appraised_value,
      status: 'pending'
    };

    this.appraisalItems.push(newItem);
    this.resetItemForm();
    this.toastService.showSuccess('Success', 'Item added to appraisal');
  }

  removeItemFromAppraisal(index: number) {
    this.appraisalItems.splice(index, 1);
    this.toastService.showInfo('Info', 'Item removed from appraisal');
  }

  private resetItemForm() {
    this.itemForm = {
      category: '',
      categoryDescription: '',
      description: '',
      appraised_value: 0
    };
  }

  getTotalAppraisedValue(): number {
    return this.appraisalItems.reduce((total, item) => total + item.appraised_value, 0);
  }

  // Complete appraisal workflow
  createAppraisal() {
    if (!this.selectedPawner && (!this.pawnerForm.first_name || !this.pawnerForm.last_name || !this.pawnerForm.phone)) {
      this.toastService.showError('Error', 'Please fill in required pawner fields');
      return;
    }

    if (this.appraisalItems.length === 0) {
      this.toastService.showError('Error', 'Please add at least one item to the appraisal');
      return;
    }

    const pawner = this.selectedPawner || {
      firstName: this.pawnerForm.first_name,
      lastName: this.pawnerForm.last_name,
      contactNumber: this.pawnerForm.phone,
      email: this.pawnerForm.email,
      city: this.pawnerForm.city,
      barangay: this.pawnerForm.barangay,
      addressDetails: this.pawnerForm.address
    };

    // Show success message and navigate back
    this.toastService.showSuccess('Success', `Appraisal created with ${this.appraisalItems.length} items`);
    this.goBack();
  }

  // Navigation methods
  goBack() {
    this.location.back();
  }

  close() {
    this.resetItemForm();
    this.resetPawnerForm();
    this.appraisalItems = [];
    this.selectedPawner = null;
    this.searchQuery = '';
    this.goBack();
  }
}
