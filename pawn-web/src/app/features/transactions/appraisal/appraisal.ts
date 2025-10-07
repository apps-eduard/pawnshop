import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
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

// Used for auto-focus functionality
interface FocusableElement {
  focus(): void;
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
export class Appraisal implements OnInit, OnDestroy, AfterViewInit {
  // ViewChild references for auto-focus
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('categorySelect') categorySelect!: ElementRef<HTMLSelectElement>;

  private destroy$ = new Subject<void>();

  // Saving state
  isSaving: boolean = false;  // Search functionality
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
    // Check API connection first
    this.checkApiConnection();
    this.loadInitialData();

    // Auto-focus the search input after component initializes with a longer delay
    // to ensure the DOM is fully ready
    setTimeout(() => {
      this.focusSearch();
      console.log('Initial focus set on search input');
    }, 800);
  }

  // Check if API server is accessible and we are authenticated
  private checkApiConnection() {
    // First check if we have a token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      this.toastService.showError('Authentication Error',
        'You are not authenticated. Please log in again.');
      // Redirect to login page
      this.router.navigate(['/login']);
      return;
    }

    // Try to access a protected endpoint to verify token validity
    this.http.get('http://localhost:3000/api/categories')
      .subscribe({
        next: () => {
          console.log('API connection successful and authentication token is valid');
        },
        error: (error) => {
          console.error('API connection or authentication failed:', error);
          if (error.status === 401 || error.status === 403) {
            this.toastService.showError('Authentication Error',
              'Your session has expired. Please log in again.');
            // Redirect to login page
            this.router.navigate(['/login']);
          } else {
            this.toastService.showWarning('API Connection Issue',
              'Cannot connect to the API server. Some features may not work correctly.');
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {
    // Focus on search input when view is ready
    setTimeout(() => {
      this.focusSearch();
      console.log('Focus set in ngAfterViewInit');
    }, 100);
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
          this.categoryDescriptions = response.data?.map(desc => desc.description_name) || [];
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
    // When selecting an existing pawner, set the form fields
    this.pawnerForm = {
      first_name: pawner.firstName,
      last_name: pawner.lastName,
      phone: pawner.contactNumber,
      email: pawner.email || '',
      cityId: pawner.cityId || '',
      barangayId: pawner.barangayId || '',
      address: pawner.addressDetails || ''
    };

    // If we have a cityId, update the filtered barangays list
    if (pawner.cityId) {
      this.onCityChange();
    }
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
      cityId: '',
      barangayId: '',
      address: ''
    };
  }

  // City/Barangay filtering
  onCityChange() {
    console.log('City ID changed to:', this.pawnerForm.cityId);

    if (this.pawnerForm.cityId) {
      const cityId = parseInt(this.pawnerForm.cityId);
      const selectedCity = this.cities.find(city => city.id === cityId);

      if (selectedCity) {
        console.log('Selected city:', selectedCity.name, '(ID:', selectedCity.id, ')');
        this.filteredBarangays = this.barangays.filter(barangay => barangay.cityId === cityId);
        console.log('Filtered barangays:', this.filteredBarangays.length);
        this.pawnerForm.barangayId = ''; // Reset barangay selection
      } else {
        console.log('No matching city found for ID:', cityId);
        this.filteredBarangays = [];
      }
    } else {
      console.log('No city ID selected');
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

    // Focus on the category select after adding an item
    setTimeout(() => {
      this.focusCategorySelect();
    }, 100);
  }

  removeItemFromAppraisal(index: number) {
    this.appraisalItems.splice(index, 1);
    this.toastService.showInfo('Info', 'Item removed from appraisal');
  }

  // Focus methods for auto-focus functionality
  focusSearch() {
    // Use setTimeout to ensure the DOM is ready and the reference exists
    setTimeout(() => {
      if (this.searchInput && this.searchInput.nativeElement) {
        console.log('Focusing search input element');
        this.searchInput.nativeElement.focus();
      } else {
        console.warn('Search input element not available for focus');
      }
    }, 0);
  }

  focusCategorySelect() {
    if (this.categorySelect) {
      this.categorySelect.nativeElement.focus();
    }
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

  // Reset all fields and focus on search
  resetAll() {
    // Clear pawner form
    this.resetPawnerForm();

    // Clear item form
    this.resetItemForm();

    // Clear appraisal items
    this.appraisalItems = [];

    // Clear selected pawner
    this.selectedPawner = null;

    // Clear search query
    this.searchQuery = '';

    // Show notification
    this.toastService.showInfo('Reset Complete', 'All fields have been cleared');

    // Focus on the search input - use setTimeout to ensure DOM is updated
    setTimeout(() => {
      this.focusSearch();
      console.log('Focus set to search input');
    }, 100);
  }

  // Complete appraisal workflow
  createAppraisal() {
    // Prevent multiple submissions
    if (this.isSaving) {
      this.toastService.showWarning('Please Wait', 'Already processing your request...');
      return;
    }

    if (!this.selectedPawner && (!this.pawnerForm.first_name || !this.pawnerForm.last_name || !this.pawnerForm.phone)) {
      this.toastService.showError('Error', 'Please fill in required pawner fields');
      return;
    }

    if (this.appraisalItems.length === 0) {
      this.toastService.showError('Error', 'Please add at least one item to the appraisal');
      return;
    }

    // If no pawner is selected, we need to create one first
    if (!this.selectedPawner) {
      this.createPawnerThenSaveAppraisal();
      return;
    }

    // If we have a selected pawner, proceed with saving the appraisal items
    this.saveAppraisalItems();
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

  // Create a new pawner and then save the appraisal items
  createPawnerThenSaveAppraisal() {
    // Get cityId and barangayId directly from form
    const cityId = parseInt(this.pawnerForm.cityId);
    const barangayId = parseInt(this.pawnerForm.barangayId);

    // Validate required fields
    if (!cityId || !barangayId || isNaN(cityId) || isNaN(barangayId)) {
      console.log('Missing or invalid cityId or barangayId:', {
        cityId: this.pawnerForm.cityId,
        barangayId: this.pawnerForm.barangayId,
        parsedCityId: cityId,
        parsedBarangayId: barangayId
      });
      this.toastService.showError('Error', 'Please select a valid city and barangay');
      return;
    }

    console.log('Creating pawner with:', {
      name: `${this.pawnerForm.first_name} ${this.pawnerForm.last_name}`,
      contact: this.pawnerForm.phone,
      cityId,
      barangayId,
      address: this.pawnerForm.address
    });

    const pawnerRequest = {
      firstName: this.pawnerForm.first_name,
      lastName: this.pawnerForm.last_name,
      contactNumber: this.pawnerForm.phone,
      email: this.pawnerForm.email || '',
      cityId: cityId,
      barangayId: barangayId,
      addressDetails: this.pawnerForm.address || '',
      isActive: true
    };

    this.pawnerService.createPawner(pawnerRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedPawner = response.data;

          // Now that we have the pawner, save the appraisal items
          this.saveAppraisalItems();
        } else {
          this.toastService.showError('Create Error', response.message || 'Failed to create pawner');
        }
      },
      error: (error) => {
        console.error('Error creating pawner:', error);
        let errorMsg = 'Error creating pawner';

        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.status === 400) {
          errorMsg = 'Missing required pawner information';
        }

        this.toastService.showError('Create Error', errorMsg);
      }
    });
  }

  // Save all appraisal items to the database
  saveAppraisalItems() {
    if (this.appraisalItems.length === 0) {
      this.toastService.showError('Error', 'Please add at least one item to the appraisal');
      return;
    }

    // Set saving state to true
    this.isSaving = true;
    this.toastService.showInfo('Processing', 'Saving appraisal items...');

    if (!this.selectedPawner) {
      this.isSaving = false;
      this.toastService.showError('Error', 'No pawner selected');
      return;
    }

    // Show loading indicator
    let itemsSaved = 0;
    const totalItems = this.appraisalItems.length;
    const savePromises: Promise<any>[] = [];

    // For each item in the appraisal, create a request and save it
    this.appraisalItems.forEach(item => {
      // Find the interest rate for the category
      const selectedCategory = this.categories.find(cat => cat.name === item.category);
      // Parse the interest_rate as a number since it's defined as string in the Category interface
      const interestRate = selectedCategory ? parseFloat(selectedCategory.interest_rate || '5') / 100 : 0.05; // Convert to decimal

      // Ensure estimated value is properly formatted as a number
      const estimatedValue = typeof item.appraised_value === 'string' ?
        parseFloat(item.appraised_value) : item.appraised_value;

      const appraisalRequest = {
        pawnerId: this.selectedPawner!.id!,
        category: item.category,
        categoryDescription: item.categoryDescription,
        description: item.description,
        serialNumber: item.serialNumber || '',
        weight: item.weight || 0,
        karat: item.karat || 0,
        estimatedValue: estimatedValue,
        interestRate: interestRate,
        notes: item.notes || ''
      };

      console.log('Sending appraisal request with data:', JSON.stringify(appraisalRequest));

      // Create a promise for each API call
      const savePromise = new Promise<void>((resolve, reject) => {
        console.log(`Attempting to save item: ${item.description}`);
        // Add a timeout to prevent hung requests
        const timeoutId = setTimeout(() => {
          console.error(`Request timeout for item: ${item.description}`);
          reject(new Error(`Request timeout for item: ${item.description}`));
        }, 20000); // 20-second timeout (increased from 10 seconds)

        // Check if we have a valid authentication token first
        const token = localStorage.getItem('token');
        if (!token) {
          clearTimeout(timeoutId);
          reject(new Error('No authentication token found. Please log in again.'));
          return;
        }

        this.appraisalService.createAppraisal(appraisalRequest).subscribe({
          next: (response) => {
            clearTimeout(timeoutId);
            if (response.success) {
              itemsSaved++;
              console.log(`Saved item ${itemsSaved}/${totalItems}: ${item.description}`);
              console.log('API response:', response);
              resolve();
            } else {
              console.error(`Failed to save item: ${response.message}`);
              reject(new Error(response.message || `Failed to save item ${item.description}`));
            }
          },
          error: (error) => {
            clearTimeout(timeoutId);
            console.error('Error saving appraisal item:', error);

            if (error.status === 0) {
              reject(new Error(`Server connection failed. Please ensure the API server is running.`));
            } else if (error.status === 401 || error.status === 403) {
              reject(new Error(`Authentication error: ${error.error?.message || 'Please log in again.'}`));
            } else if (error.status === 400) {
              reject(new Error(`Validation error: ${error.error?.message || 'Please check the item data.'}`));
            } else if (error.status === 500) {
              reject(new Error(`Server error: ${error.error?.message || 'Internal server error.'}`));
            } else {
              reject(new Error(`Error (${error.status}): ${error.error?.message || error.message || 'Unknown error'}`));
            }
          }
        });
      });

      savePromises.push(savePromise);
    });

    // Log the API connection attempt
    console.log(`Attempting to save ${totalItems} items to API at ${this.appraisalService['API_URL']}/appraisals`);

    // Wait for all promises to resolve
    Promise.all(savePromises)
      .then(() => {
        // All items saved successfully
        this.isSaving = false;
        this.resetAll(); // Clear form after successful save
        this.goBack();
      })
      .catch((error) => {
        // At least one item failed to save
        this.isSaving = false;
        console.error('Error during batch save:', error);

        // Check for specific error conditions
        if (error.message.includes('connection failed')) {
          this.toastService.showError('Connection Error',
            'Cannot connect to the API server. Please make sure the server is running.');
        } else if (error.message.includes('Authentication error')) {
          this.toastService.showError('Authentication Error',
            'Your session has expired. Please log in again.');
          this.router.navigate(['/login']);
        } else if (error.message.includes('Validation error')) {
          this.toastService.showError('Validation Error',
            error.message.replace('Validation error: ', ''));
        } else {
          this.toastService.showError('Save Error',
            `Failed to save items. ${error.message || 'Please try again.'}`);
        }
      });
  }
}
