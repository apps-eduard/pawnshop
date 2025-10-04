import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PawnerService } from '../../../core/services/pawner.service';
import { ItemService } from '../../../core/services/item.service';
import { AddressService } from '../../../core/services/address.service';
import { AppraisalService } from '../../../core/services/appraisal.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';


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
  category: string;
  categoryDescription?: string;
  description: string;
  estimatedValue: number;
  serialNumber?: string;
  notes?: string; // Combined: condition notes, appraisal notes, etc.
  weight?: number;
  karat?: number;
  status: 'pending' | 'approved' | 'rejected';
  pawnerName?: string;
  pawnerContact?: string;
  createdAt?: Date | string;
}

interface CategoryDescription {
  description: string;
  id?: number;
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
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('categorySelect') categorySelect!: ElementRef<HTMLSelectElement>;

  currentDateTime = new Date();
  isLoading = false;
  isSearching = false;

  // Authentication properties
  isLoggedIn = false;
  currentUser: any = null;

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
    category: '',
    categoryDescription: '',
    description: '',
    estimatedValue: 0,
    serialNumber: '',
    notes: '',
    weight: undefined,
    karat: undefined,
    status: 'pending'
  };

  // List of items for current appraisal
  appraisalItems: AppraisalItem[] = [];

  // Categories loaded from database
  categories: Array<{name: string, interestRate: number, description?: string, id?: number}> = [];

  // Filtered category descriptions
  filteredCategoryDescriptions: CategoryDescription[] = [];

  // Track loading state for category descriptions
  isLoadingDescriptions: boolean = false;

  // Category descriptions based on selected category
  categoryDescriptions: { [key: string]: CategoryDescription[] } = {
    'Jewelry': [
      { description: 'Gold Ring' },
      { description: 'Gold Necklace' },
      { description: 'Gold Bracelet' },
      { description: 'Gold Earrings' },
      { description: 'Silver Ring' },
      { description: 'Silver Necklace' },
      { description: 'Silver Bracelet' },
      { description: 'Platinum Ring' },
      { description: 'Diamond Ring' },
      { description: 'Pearl Necklace' },
      { description: 'Watch - Gold' },
      { description: 'Watch - Silver' },
      { description: 'Other Jewelry' }
    ],
    'Appliances': [
      { description: 'Refrigerator' },
      { description: 'Washing Machine' },
      { description: 'Air Conditioner' },
      { description: 'Microwave Oven' },
      { description: 'Electric Fan' },
      { description: 'Rice Cooker' },
      { description: 'Blender' },
      { description: 'Oven Toaster' },
      { description: 'Iron' },
      { description: 'Vacuum Cleaner' },
      { description: 'Water Dispenser' },
      { description: 'Other Appliance' }
    ],
    'Electronics': [
      { description: 'Mobile Phone' },
      { description: 'Laptop' },
      { description: 'Tablet' },
      { description: 'Smart Watch' },
      { description: 'Camera' },
      { description: 'Gaming Console' },
      { description: 'Television' },
      { description: 'Sound System' },
      { description: 'DVD Player' },
      { description: 'Computer Monitor' },
      { description: 'Printer' },
      { description: 'Other Electronic' }
    ],
    'Tools': [
      { description: 'Power Drill' },
      { description: 'Generator' },
      { description: 'Welding Machine' },
      { description: 'Angle Grinder' },
      { description: 'Circular Saw' },
      { description: 'Hammer Drill' },
      { description: 'Compressor' },
      { description: 'Other Tool' }
    ],
    'Vehicles': [
      { description: 'Motorcycle' },
      { description: 'Bicycle' },
      { description: 'Car' },
      { description: 'Scooter' },
      { description: 'ATV' },
      { description: 'Other Vehicle' }
    ],
    'Other': [
      { description: 'Furniture' },
      { description: 'Musical Instrument' },
      { description: 'Artwork' },
      { description: 'Collectible' },
      { description: 'Antique' },
      { description: 'Other Item' }
    ]
  };

  // Add Category Description Modal
  showAddCategoryDescriptionModal = false;
  newCategoryDescription = '';
  isAddingCategoryDescription = false;

  // Method to handle category selection
  onCategoryChange() {
    console.log('Category changed to:', this.currentItem.category);

    if (this.currentItem.category) {
      // Reset category description when category changes
      this.currentItem.categoryDescription = '';

      // Check if we have any cached descriptions for this category
      const cachedDescriptions = this.categoryDescriptions[this.currentItem.category];
      console.log('Cached descriptions for', this.currentItem.category, ':', cachedDescriptions);

      // Initially set from cache if available
      this.filteredCategoryDescriptions = cachedDescriptions || [];

      // Force a UI update using setTimeout
      setTimeout(() => {
        console.log('After timeout - filtered descriptions:', this.filteredCategoryDescriptions);
      }, 0);

      // Always fetch fresh descriptions from the server
      this.loadCategoryDescriptions(this.currentItem.category);
    } else {
      this.filteredCategoryDescriptions = [];
    }
  }

  // Add default descriptions based on category
  addDefaultDescriptions(categoryName: string) {
    console.log('Adding default descriptions for', categoryName);
    let defaults: {description: string}[] = [];

    switch(categoryName.toLowerCase()) {
      case 'jewelry':
        defaults = [
          { description: '14K Gold Ring' },
          { description: '18K Gold Necklace' },
          { description: 'Silver Bracelet' },
          { description: 'Diamond Earrings' }
        ];
        break;
      case 'appliances':
        defaults = [
          { description: 'Refrigerator' },
          { description: 'Washing Machine' },
          { description: 'Television' },
          { description: 'Microwave Oven' }
        ];
        break;
      case 'electronics':
        defaults = [
          { description: 'Smartphone' },
          { description: 'Laptop Computer' },
          { description: 'Digital Camera' },
          { description: 'Tablet' }
        ];
        break;
      case 'vehicles':
        defaults = [
          { description: 'Motorcycle' },
          { description: 'Bicycle' },
          { description: 'Scooter' }
        ];
        break;
      default:
        defaults = [
          { description: 'General Item' }
        ];
    }

    this.categoryDescriptions[categoryName] = defaults;
    this.filteredCategoryDescriptions = [...defaults];
    console.log('Added default descriptions:', this.filteredCategoryDescriptions);
  }

  // Helper method to load category descriptions from server if not already loaded
  loadCategoryDescriptions(categoryName: string) {
    console.log('Loading descriptions for category:', categoryName);
    this.isLoadingDescriptions = true;

    // Add default descriptions if we don't have any for this category yet
    if (!this.categoryDescriptions[categoryName] || this.categoryDescriptions[categoryName].length === 0) {
      this.addDefaultDescriptions(categoryName);
    }

    this.categoriesService.getCategoriesWithDescriptions().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          console.log('API response for descriptions:', response.data);

          // Find the category and its descriptions
          const category = response.data.find((cat: any) => cat.name === categoryName);
          console.log('Found category:', category);

          if (category && category.descriptions && category.descriptions.length > 0) {
            // Update the category descriptions
            const mappedDescriptions = category.descriptions.map((desc: any) =>
              ({ description: desc.name }));

            this.categoryDescriptions[categoryName] = mappedDescriptions;

            // Create a new array to force change detection
            this.filteredCategoryDescriptions = [...mappedDescriptions];
            console.log('Updated filteredCategoryDescriptions with server data:', this.filteredCategoryDescriptions);
          } else {
            console.warn(`No descriptions found in API for category: ${categoryName}`);
            // We'll keep using the default descriptions we added earlier
          }
        } else {
          console.error('API response error or no data:', response);
        }
      },
      error: (error: any) => {
        console.error('Error loading category descriptions:', error);
        // We'll keep using the default descriptions we added earlier
        this.isLoadingDescriptions = false;
      },
      complete: () => {
        this.isLoadingDescriptions = false;
        console.log('Category descriptions loading complete, final result:', this.filteredCategoryDescriptions);
      }
    });
  }

  // Recent Appraisals
  recentAppraisals: AppraisalItem[] = [];

  // Dashboard Cards
  dashboardCards = [
    {
      title: 'Pending Appraisals',
      count: 0,
      icon: 'pending',
      color: 'yellow',
      route: '/appraisals'
    },
    {
      title: 'Completed Today',
      count: 0,
      icon: 'completed',
      color: 'green',
      route: '/appraisals'
    },
    {
      title: 'High Value Items',
      count: 0,
      icon: 'high-value',
      color: 'blue',
      route: '/appraisals'
    },
    {
      title: 'Average Appraisal',
      count: 0,
      icon: 'average',
      color: 'purple',
      route: '/appraisals'
    }
  ];

  // Item Categories
  itemCategories = [
    {
      name: 'Jewelry - Gold',
      count: 0,
      avgValue: 25000,
      color: 'yellow'
    },
    {
      name: 'Electronics',
      count: 0,
      avgValue: 15000,
      color: 'blue'
    },
    {
      name: 'Appliances',
      count: 0,
      avgValue: 20000,
      color: 'green'
    },
    {
      name: 'Vehicles',
      count: 0,
      avgValue: 50000,
      color: 'red'
    }
  ];

  constructor(
    private http: HttpClient,
    private pawnerService: PawnerService,
    private itemService: ItemService,
    private addressService: AddressService,
    private appraisalService: AppraisalService,
    private toastService: ToastService,
    private categoriesService: CategoriesService,
    private router: Router
  ) {}

  // Check authentication status
  checkAuthStatus(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');

    console.log(`� [${new Date().toISOString()}] Auth Status Check:`, {
      token: token ? `Present (${token.substring(0, 20)}...)` : 'Missing',
      user: user ? 'Present' : 'Missing',
      tokenLength: token?.length || 0,
      userPreview: user ? JSON.parse(user).username : 'N/A'
    });

    if (token && user) {
      this.currentUser = JSON.parse(user);
      this.isLoggedIn = true;
      console.log(`✅ [${new Date().toISOString()}] Authentication confirmed:`, {
        username: this.currentUser.username,
        role: this.currentUser.role,
        isLoggedIn: this.isLoggedIn
      });
    } else {
      this.isLoggedIn = false;
      this.currentUser = null;
      console.log(`❌ [${new Date().toISOString()}] Not authenticated - missing credentials`);
    }
  }

  ngOnInit() {
    // Check authentication status on component load
    this.checkAuthStatus();

    this.loadCities();
    this.loadCategories();
    this.loadRecentAppraisals();
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // Auto-focus search input after view init
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  updateTime() {
    this.currentDateTime = new Date();
  }

  // Simple test method to verify functionality
  testSearchMethod() {
    console.log('🧪 TEST: searchPawners method called!');
    console.log('🧪 TEST: searchQuery =', this.searchQuery);
    console.log('🧪 TEST: isLoggedIn =', this.isLoggedIn);
    console.log('🧪 TEST: token exists =', !!localStorage.getItem('token'));
    alert(`TEST: Search called with query: "${this.searchQuery}"`);
  }

  // Load Categories from Database
  loadCategories() {
    console.log('🏷️ Loading categories from database...');

    this.categoriesService.getCategoriesWithDescriptions().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('✅ Categories loaded:', response.data);

          // Transform database categories to component format
          this.categories = response.data.map(cat => {
            // Convert interest rate to decimal if needed
            let rate = parseFloat(cat.interest_rate);
            // If rate is greater than 1, assume it's already in percentage form and convert to decimal
            if (rate > 1) {
              rate = rate / 100;
            }

            return {
              id: cat.id,
              name: cat.name,
              interestRate: rate, // Keep as decimal (0.03 for 3%, 0.06 for 6%)
              description: cat.notes || ''
            };
          });

          // Build category descriptions mapping
          this.categoryDescriptions = {};
          response.data.forEach(cat => {
            if (cat.descriptions && cat.descriptions.length > 0) {
              this.categoryDescriptions[cat.name] = cat.descriptions.map(desc => ({ description: desc.name }));
            } else {
              this.categoryDescriptions[cat.name] = [];
            }
          });

          console.log('📋 Category descriptions mapping:', this.categoryDescriptions);

        } else {
          console.error('❌ Failed to load categories:', response.message);
          this.toastService.showError('Error', 'Failed to load categories');
        }
      },
      error: (error) => {
        console.error('❌ Error loading categories:', error);
        this.toastService.showError('Error', 'Failed to load categories');
      }
    });
  }

  // Search Pawners
  searchPawners() {
    console.log(`🔍 [${new Date().toISOString()}] === SEARCH PAWNERS METHOD STARTED ===`);
    console.log(`🔍 [${new Date().toISOString()}] Search query: "${this.searchQuery}"`);

    // Check authentication first
    this.checkAuthStatus();
    console.log(`🔍 [${new Date().toISOString()}] After checkAuthStatus - isLoggedIn: ${this.isLoggedIn}`);

    if (!this.isLoggedIn) {
      console.error(`❌ [${new Date().toISOString()}] Search blocked - not authenticated`);
      this.toastService.showError('Authentication Required', 'Please login first');
      return;
    }

    console.log(`🔍 [${new Date().toISOString()}] Checking search query: "${this.searchQuery}" (trimmed: "${this.searchQuery.trim()}")`);

    if (!this.searchQuery.trim()) {
      console.log(`❌ [${new Date().toISOString()}] Empty search query - showing warning`);
      this.searchResults = [];
      this.toastService.showWarning('Search', 'Please enter a search term');
      return;
    }

    console.log(`✅ [${new Date().toISOString()}] Search query valid - proceeding with search`);
    this.isSearching = true;
    console.log('🔍 Searching pawners:', this.searchQuery);

    console.log(`📤 [${new Date().toISOString()}] Making API request to search pawners...`);
    console.log(`🔗 API URL: http://localhost:3000/api/pawners/search?q=${encodeURIComponent(this.searchQuery)}`);
    console.log(`🎫 Token: ${localStorage.getItem('token')?.substring(0, 20)}...`);
    console.log(`🔧 [${new Date().toISOString()}] About to call pawnerService.searchPawners("${this.searchQuery}")`);

    try {
      this.pawnerService.searchPawners(this.searchQuery).subscribe({
        next: (response) => {
        this.isSearching = false;
        console.log(`📥 [${new Date().toISOString()}] API Response received:`, response);

        if (response.success) {
          this.searchResults = response.data;
          console.log(`✅ Found ${this.searchResults.length} pawners:`, this.searchResults);

          if (this.searchResults.length === 0) {
            this.toastService.showInfo('Search Results', 'No pawners found. You can create a new one.');
          } else {
            this.toastService.showSuccess('Search Results', `Found ${this.searchResults.length} pawner(s)`);
          }
        } else {
          console.error('❌ API returned unsuccessful response:', response);
          this.toastService.showError('Search Error', response.message || 'Failed to search pawners');
        }
        },
        error: (error) => {
          this.isSearching = false;
          console.error(`❌ [${new Date().toISOString()}] Network/API Error:`, {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });

          let errorMessage = 'Error searching pawners';
          if (error.status === 401) {
            errorMessage = 'Authentication required. Please log in first.';
          } else if (error.status === 0) {
            errorMessage = 'Cannot connect to server. Please check if the API server is running.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.toastService.showError('Search Error', errorMessage);
        }
      });
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Exception in searchPawners:`, error);
      this.isSearching = false;
      this.toastService.showError('Search Error', 'An unexpected error occurred');
    }
  }

  // Clear Search
  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearching = false;
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Select Pawner
  selectPawner(pawner: Pawner) {
    this.selectedPawner = pawner;
    this.searchResults = [];
    this.searchQuery = `${pawner.firstName} ${pawner.lastName} - ${pawner.contactNumber}`;

    // Populate the form fields with selected pawner data
    this.newPawner = {
      firstName: pawner.firstName || '',
      lastName: pawner.lastName || '',
      contactNumber: pawner.contactNumber || '',
      email: pawner.email || '',
      cityId: pawner.cityId || 0,
      barangayId: pawner.barangayId || 0,
      addressDetails: pawner.addressDetails || ''
    };

    // Show the pawner form so user can see and edit the details
    this.showCreatePawnerForm = true;

    // Load barangays for the selected city if cityId exists
    if (pawner.cityId) {
      this.onCityChange();
    }

    // Navigate to appraisal page for the selected pawner
    this.router.navigate(['/transactions/appraisal']);

    // Reset current item for the selected pawner
    this.currentItem = {
      pawnerId: this.selectedPawner.id!,
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };

    // Auto-focus on category select after modal opens
    setTimeout(() => {
      if (this.categorySelect && this.categorySelect.nativeElement) {
        this.categorySelect.nativeElement.focus();
      }
    }, 300);

    this.toastService.showSuccess('Pawner Selected', `Starting new appraisal for ${pawner.firstName} ${pawner.lastName}`);
  }

  // Start New Appraisal - Show Modal with Create Pawner Form and Item Form
  startNewAppraisal() {
    // Navigate to transactions/appraisal route
    this.router.navigate(['/transactions/appraisal']);

    // Reset current item
    this.currentItem = {
      pawnerId: 0, // Will be set after pawner is created
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };
    this.filteredCategoryDescriptions = [];
    this.appraisalItems = []; // Clear any existing items
    this.showItemForm = true;

    // Auto-focus First Name field in the modal after forms are shown
    setTimeout(() => {
      // Target the firstName input specifically within the modal
      const modalFirstNameInput = document.querySelector('.fixed.inset-0 input[name="firstName"]') as HTMLInputElement;
      if (modalFirstNameInput) {
        modalFirstNameInput.focus();
      }
    }, 200);
  }

  // Show Create Pawner Form (keeping for backward compatibility)
  showCreateForm() {
    this.startNewAppraisal();
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
          // Close the modal after creating a pawner
          this.showNewAppraisalModal = false;
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
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };
    this.filteredCategoryDescriptions = [];
    this.showItemForm = true;

    // Auto-focus category field after form is shown
    setTimeout(() => {
      const categorySelect = document.querySelector('select[name="category"]') as HTMLSelectElement;
      if (categorySelect) {
        categorySelect.focus();
      }
    }, 100);
  }

  // Load Recent Appraisals
  loadRecentAppraisals() {
    this.appraisalService.getAppraisals().subscribe({
      next: (response) => {
        if (response.success) {
          // Get only the latest 10 appraisals
          this.recentAppraisals = response.data.slice(0, 10).map(appraisal => ({
            id: appraisal.id,
            pawnerId: appraisal.pawnerId,
            category: appraisal.category || 'Jewelry', // fallback for existing data
            categoryDescription: appraisal.categoryDescription || '',
            description: appraisal.description,
            estimatedValue: appraisal.estimatedValue,
            weight: appraisal.weight,
            karat: appraisal.karat,
            notes: appraisal.notes || '',
            serialNumber: appraisal.serialNumber || '',
            status: appraisal.status as 'pending' | 'approved' | 'rejected',
            pawnerName: appraisal.pawnerName || 'Unknown Customer',
            pawnerContact: appraisal.pawnerContact || 'No contact',
            createdAt: appraisal.createdAt || new Date()
          }));
        }
      },
      error: (error) => {
        console.error('Error loading recent appraisals:', error);
      }
    });
  }

  // Add Item to Appraisal List
  addItemToAppraisal() {
    // Check required fields
    if (!this.currentItem.category || !this.currentItem.estimatedValue) {
      this.toastService.showWarning('Validation Error', 'Please fill in required fields: Category and Estimated Value');
      return;
    }

    // Check if we have a pawner or if we're in the process of creating one
    if (!this.selectedPawner) {
      // Just proceed with adding the item - we'll associate it with pawner later
      console.log('No pawner selected yet, but continuing to add item to list');
    }

    // Get the selected category data for interest rate
    const selectedCategory = this.categories.find(cat => cat.name === this.currentItem.category);
    const interestRate = selectedCategory ? selectedCategory.interestRate : 0.05;

    // Create a copy of the current item and add to appraisal list
    const itemToAdd: AppraisalItem = {
      ...this.currentItem,
      id: Date.now(), // Temporary ID for display purposes
      pawnerId: this.selectedPawner ? this.selectedPawner.id! : 0, // Use 0 as temp ID if no pawner selected yet
      status: 'pending'
    };

    this.appraisalItems.push(itemToAdd);
    this.toastService.showSuccess('Item Added', 'Item added to appraisal list');

    // Reset only the current item form fields for next item, but keep the form open
    this.currentItem = {
      pawnerId: this.selectedPawner ? this.selectedPawner.id! : 0,
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };
    this.filteredCategoryDescriptions = [];

    // Auto-focus Category field after adding item
    setTimeout(() => {
      const categorySelect = document.querySelector('select[name="category"]') as HTMLSelectElement;
      if (categorySelect) {
        categorySelect.focus();
      }
    }, 100);
  }

  // Create pawner then add item
  createPawnerThenAddItem() {
    if (!this.newPawner.firstName || !this.newPawner.lastName || !this.newPawner.contactNumber) {
      this.toastService.showWarning('Validation Error', 'Please fill in required fields (First Name, Last Name, Contact Number)');
      return;
    }

    console.log('Creating pawner then adding item:', this.newPawner);

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
          this.toastService.showSuccess('Success', 'Pawner created successfully');

          // Reset pawner form but keep it visible for further edits if needed
          this.newPawner = {
            firstName: '',
            lastName: '',
            contactNumber: '',
            email: '',
            cityId: undefined,
            barangayId: undefined,
            addressDetails: ''
          };

          // Now add the item
          this.addItemToAppraisal();
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

  // Create pawner then save all appraisal items
  createPawnerThenSaveAppraisal() {
    if (!this.newPawner.firstName || !this.newPawner.lastName || !this.newPawner.contactNumber) {
      this.toastService.showWarning('Validation Error', 'Please fill in required pawner fields (First Name, Last Name, Contact Number)');
      return;
    }

    console.log('Creating pawner then saving appraisal:', this.newPawner);

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
          this.toastService.showSuccess('Success', 'Pawner created successfully');

          // Update all items with the new pawner ID
          this.appraisalItems.forEach(item => {
            item.pawnerId = this.selectedPawner!.id!;
          });

          // Now save the appraisal items
          this.saveAppraisal();
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

  // Save All Items in Appraisal
  saveAppraisal() {
    if (this.appraisalItems.length === 0) {
      this.toastService.showWarning('Validation Error', 'Please add at least one item to the appraisal');
      return;
    }

    // If we have items but no pawner selected and the pawner form is open,
    // we should create the pawner first
    if (!this.selectedPawner && this.showCreatePawnerForm) {
      // Create pawner first, then save items
      this.createPawnerThenSaveAppraisal();
      return;
    } else if (!this.selectedPawner) {
      this.toastService.showWarning('Validation Error', 'Please select or create a pawner first');
      return;
    }

    console.log('Saving appraisal with items:', this.appraisalItems);
    let itemsSaved = 0;
    const totalItems = this.appraisalItems.length;

    // Save each item in the appraisal
    this.appraisalItems.forEach((item) => {
      // Get the selected category data for interest rate
      const selectedCategory = this.categories.find(cat => cat.name === item.category);
      const interestRate = selectedCategory ? selectedCategory.interestRate : 0.05; // Already in decimal format

      const appraisalRequest = {
        pawnerId: this.selectedPawner!.id!,
        category: item.category,
        categoryDescription: item.categoryDescription || undefined,
        description: item.description,
        serialNumber: item.serialNumber || undefined,
        weight: item.weight || undefined,
        karat: item.karat || undefined,
        estimatedValue: item.estimatedValue,
        interestRate: interestRate,
        notes: item.notes || undefined
      };

      this.appraisalService.createAppraisal(appraisalRequest).subscribe({
        next: (response) => {
          if (response.success) {
            itemsSaved++;

            // Add to recent appraisals
            this.recentAppraisals.unshift({
              id: response.data.id,
              pawnerId: response.data.pawnerId,
              category: response.data.category,
              categoryDescription: response.data.categoryDescription,
              description: response.data.description,
              estimatedValue: response.data.estimatedValue,
              weight: response.data.weight,
              karat: response.data.karat,
              notes: response.data.notes,
              serialNumber: response.data.serialNumber,
              status: response.data.status as 'pending' | 'approved' | 'rejected',
              pawnerName: this.selectedPawner ? `${this.selectedPawner.firstName} ${this.selectedPawner.lastName}` : 'Unknown Customer',
              pawnerContact: this.selectedPawner?.contactNumber || 'No contact',
              createdAt: new Date()
            });

            // Check if all items are saved
            if (itemsSaved === totalItems) {
              // Keep only latest 10 recent appraisals
              this.recentAppraisals = this.recentAppraisals.slice(0, 10);

              // Show success message with proper details
              const pawnerName = this.selectedPawner ? `${this.selectedPawner.firstName} ${this.selectedPawner.lastName}` : 'Customer';
              const totalValue = this.formatCurrency(this.calculateTotalValue());

              this.toastService.showSuccess(
                'Appraisal Saved Successfully!',
                `${totalItems} item${totalItems > 1 ? 's' : ''} appraised for ${pawnerName} with total value of ${totalValue}. Status: Pending approval.`
              );

              // Clear selected pawner
              this.selectedPawner = null;
              this.searchQuery = '';
              this.searchResults = [];

              // Close modal and reset everything
              this.closeNewAppraisalModal();
              this.resetAll(); // Clear everything for next appraisal

              // Refresh dashboard data to show updated counts and recent appraisals
              this.loadRecentAppraisals();
            }
          } else {
            this.toastService.showError('Save Error', response.message || 'Failed to save appraisal item');
          }
        },
        error: (error) => {
          console.error('Error saving appraisal item:', error);
          this.toastService.showError('Save Error', 'Error saving appraisal item');
        }
      });
    });
  }

  // Remove Item from Appraisal List
  removeItemFromAppraisal(index: number) {
    this.appraisalItems.splice(index, 1);
    this.toastService.showInfo('Item Removed', 'Item removed from appraisal list');
  }

  // Calculate total value of all items in appraisal
  calculateTotalValue(): number {
    return this.appraisalItems.reduce((total, item) => total + (item.estimatedValue || 0), 0);
  }

  // Validation methods
  isPawnerFormValid(): boolean {
    if (this.selectedPawner) {
      return true; // If we have a selected pawner, form is valid
    }

    if (this.showCreatePawnerForm) {
      return !!(
        this.newPawner.firstName?.trim() &&
        this.newPawner.lastName?.trim() &&
        this.newPawner.contactNumber?.trim() &&
        this.newPawner.cityId
      );
    }

    return false;
  }

  hasItemsInTable(): boolean {
    return this.appraisalItems.length > 0;
  }

  isSaveEnabled(): boolean {
    return this.isPawnerFormValid() && this.hasItemsInTable();
  }

  // Auto-focus on category after adding item
  focusOnCategory() {
    setTimeout(() => {
      if (this.categorySelect?.nativeElement) {
        this.categorySelect.nativeElement.focus();
      }
    }, 100);
  }

  // Format and validate contact number
  formatContactNumber(event: any) {
    let value = event.target.value;
    // Remove all non-numeric characters except +, -, spaces, and parentheses
    value = value.replace(/[^\d+\-\s\(\)]/g, '');
    event.target.value = value;
    this.newPawner.contactNumber = value;
  }

  // Validate email format
  isValidEmail(email: string): boolean {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Legacy method for single item save (kept for compatibility)
  saveItemAppraisal() {
    this.addItemToAppraisal();
  }

  // Reset Item Form
  resetItemForm(keepItems: boolean = true) {
    this.showItemForm = false;
    this.showCreatePawnerForm = false; // Also close the create pawner form

    if (!keepItems) {
      this.selectedPawner = null; // Clear selected pawner
      this.searchQuery = '';
      this.searchResults = [];
      this.appraisalItems = []; // Clear appraisal items
    }

    this.currentItem = {
      pawnerId: this.selectedPawner?.id || 0,
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };
    this.filteredCategoryDescriptions = [];
  }

  // Reset everything - clear table and all input fields
  resetAll() {
    // Clear all appraisal items (table)
    this.appraisalItems = [];

    // Always clear pawner selection and form when resetAll is called
    this.selectedPawner = null;
    this.searchQuery = '';
    this.searchResults = [];

    // Reset new pawner form completely
    this.newPawner = {
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      cityId: undefined,
      barangayId: undefined,
      addressDetails: ''
    };

    // Reset current item form
    this.currentItem = {
      pawnerId: 0,
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };

    // Clear all filters and selections
    this.filteredCategoryDescriptions = [];
    this.filteredBarangays = [...this.barangays];

    // Force Angular to refresh the view and focus on category field
    setTimeout(() => {
      // This ensures the form fields are visually cleared and then focus on category
      if (this.categorySelect?.nativeElement) {
        this.categorySelect.nativeElement.focus();
      }
    }, 100);

    this.toastService.showInfo('Reset Complete', 'All fields and items have been cleared');
  }

  // Reset only the current item form (not the pawner info or table)
  resetCurrentItem() {
    this.currentItem = {
      pawnerId: this.selectedPawner?.id || 0,
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };

    // Clear category descriptions
    this.filteredCategoryDescriptions = [];

    // Focus back to category field
    this.focusOnCategory();

    this.toastService.showInfo('Item Form Reset', 'Current item form has been cleared');
  }

  // Get total estimated value of all items in appraisal
  getTotalEstimatedValue(): number {
    return this.appraisalItems.reduce((total, item) => total + (item.estimatedValue || 0), 0);
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

  // Format number with commas for display (without currency symbol)
  formatNumberWithCommas(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // Handle input formatting for estimated value
  onEstimatedValueInput(event: any): void {
    const input = event.target;
    let value = input.value.replace(/[^0-9.]/g, ''); // Remove non-numeric characters except decimal

    // Ensure only one decimal point
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
      value = value.substring(0, value.lastIndexOf('.'));
    }

    // Update the model value
    const numericValue = parseFloat(value) || 0;
    this.currentItem.estimatedValue = numericValue;

    // Format for display
    if (numericValue > 0) {
      const formatted = this.formatNumberWithCommas(numericValue);
      input.value = formatted;
    }
  }

  // Handle blur event to ensure proper formatting
  onEstimatedValueBlur(event: any): void {
    const input = event.target;
    const numericValue = this.currentItem.estimatedValue || 0;

    if (numericValue > 0) {
      input.value = this.formatNumberWithCommas(numericValue);
    } else {
      input.value = '0.00';
      this.currentItem.estimatedValue = 0;
    }
  }

  // Handle focus event to show raw number for editing
  onEstimatedValueFocus(event: any): void {
    const input = event.target;
    const numericValue = this.currentItem.estimatedValue || 0;

    if (numericValue > 0) {
      input.value = numericValue.toString();
    } else {
      input.value = '';
    }
  }

  // Get Item Type Category
  getItemTypeCategory(itemType: string): string {
    if (itemType.toLowerCase().includes('jewelry')) return 'Jewelry';
    if (itemType.toLowerCase().includes('electronics')) return 'Electronics';
    if (itemType.toLowerCase().includes('appliance')) return 'Appliances';
    if (itemType.toLowerCase().includes('vehicle')) return 'Vehicles';
    return 'Other';
  }

  // Get Item Category Description
  getItemCategoryDescription(category: string): string {
    switch (category.toLowerCase()) {
      case 'jewelry':
        return 'Gold, silver, and precious stone jewelry items';
      case 'electronics':
        return 'Electronic devices and gadgets';
      case 'appliances':
        return 'Home appliances and equipment';
      case 'vehicles':
        return 'Motorcycles, bicycles, and other vehicles';
      default:
        return 'Other miscellaneous items';
    }
  }

  // Category Description Modal Methods
  openAddCategoryDescriptionDialog() {
    if (!this.currentItem.category) {
      this.toastService.showWarning('Selection Required', 'Please select a category first');
      return;
    }

    this.newCategoryDescription = '';
    this.showAddCategoryDescriptionModal = true;

    // Focus the input field after a short delay
    setTimeout(() => {
      const input = document.querySelector('input[name="newCategoryDescription"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }

  closeAddCategoryDescriptionDialog() {
    this.showAddCategoryDescriptionModal = false;
    this.newCategoryDescription = '';
    this.isAddingCategoryDescription = false;
  }

  async addCategoryDescription() {
    if (!this.newCategoryDescription || this.newCategoryDescription.trim() === '') {
      this.toastService.showWarning('Validation Error', 'Please enter a description');
      return;
    }

    if (!this.currentItem.category) {
      this.toastService.showError('Error', 'No category selected');
      return;
    }

    // Find the category ID
    const selectedCategory = this.categories.find(cat => cat.name === this.currentItem.category);
    if (!selectedCategory || !selectedCategory.id) {
      this.toastService.showError('Error', 'Category not found');
      return;
    }

    this.isAddingCategoryDescription = true;

    try {
      console.log('Adding category description:', this.newCategoryDescription, 'to category:', selectedCategory.id);

      const response = await this.categoriesService.createCategoryDescription(
        selectedCategory.id,
        { description: this.newCategoryDescription.trim() }
      ).toPromise();

      if (response?.success) {
        this.toastService.showSuccess('Success', 'Category description added successfully');

        // Add to the filtered descriptions list immediately
        this.filteredCategoryDescriptions.push({ description: this.newCategoryDescription.trim() });

        // Also add to the main categoryDescriptions object for future use
        if (!this.categoryDescriptions[this.currentItem.category]) {
          this.categoryDescriptions[this.currentItem.category] = [];
        }
        this.categoryDescriptions[this.currentItem.category].push({ description: this.newCategoryDescription.trim() });

        // Close the modal
        this.closeAddCategoryDescriptionDialog();

        // Optionally, reload categories to get fresh data
        // this.loadCategories();

      } else {
        throw new Error(response?.message || 'Failed to add category description');
      }

    } catch (error: any) {
      console.error('Error adding category description:', error);

      if (error.status === 409) {
        this.toastService.showError('Duplicate Entry', 'This description already exists for this category');
      } else {
        this.toastService.showError('Error', error.message || 'Failed to add category description');
      }
    } finally {
      this.isAddingCategoryDescription = false;
    }
  }

  // Get Category Icon
  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'Jewelry': '💍',
      'Appliances': '🔌',
      'Electronics': '📱',
      'Vehicles': '🚗',
      'Tools': '🔧',
      'Gadgets': '💻'
    };
    return iconMap[category] || '📦';
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

  // Get Card Color Classes
  getCardColorClasses(color: string): string {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400';
      case 'green':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400';
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400';
      case 'red':
        return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400';
    }
  }

  // Get Category Color Classes
  getCategoryColorClasses(color: string): string {
    switch (color) {
      case 'yellow':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'blue':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      case 'green':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'red':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20';
    }
  }

  // Quick login for testing
  quickLogin() {
    const loginData = {
      username: 'appraiser1',
      password: 'appraiser123'
    };

    console.log(`🔐 [${new Date().toISOString()}] Attempting quick login with:`, loginData.username);
    console.log(`🔗 Login API URL: http://localhost:3000/api/auth/login`);

    this.http.post<any>('http://localhost:3000/api/auth/login', loginData).subscribe({
      next: (response) => {
        console.log(`📥 [${new Date().toISOString()}] Login response:`, response);

        if (response.success && response.data?.user && response.data?.token) {
          localStorage.setItem('currentUser', JSON.stringify(response.data.user));
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);

          console.log(`✅ [${new Date().toISOString()}] Login successful:`, {
            user: response.data.user,
            tokenPreview: response.data.token.substring(0, 20) + '...'
          });

          this.toastService.showSuccess('Login Success', `Logged in as ${response.data.user.firstName} ${response.data.user.lastName}`);
        } else {
          console.error(`❌ [${new Date().toISOString()}] Login failed - invalid response:`, response);
          this.toastService.showError('Login Failed', response.message || 'Invalid credentials');
        }
      },
      error: (error) => {
        console.error(`❌ [${new Date().toISOString()}] Login network error:`, {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        this.toastService.showError('Login Error', 'Failed to connect to server');
      }
    });
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token') && !!localStorage.getItem('currentUser');
  }

  // Get current user
  getCurrentUser(): any {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Add City and Barangay functionality - Modal versions
  // Properties for the modals
  showAddCityModal = false;
  showAddBarangayModal = false;
  showNewAppraisalModal = false; // Keep for backward compatibility

  newCityName = '';
  newBarangayName = '';
  isAddingCity = false;
  isAddingBarangay = false;
  isCreatingPawner = false;
  isSavingItem = false;

  // Open the City modal
  showAddCityDialog() {
    this.showAddCityModal = true;
    this.newCityName = '';
    setTimeout(() => {
      const cityInput = document.querySelector('#cityNameInput') as HTMLInputElement;
      if (cityInput) {
        cityInput.focus();
      }
    }, 100);
  }

  // Close the City modal
  closeAddCityModal() {
    this.showAddCityModal = false;
  }

  // Submit the new city
  submitNewCity() {
    if (this.newCityName && this.newCityName.trim()) {
      this.isAddingCity = true;
      this.addNewCity(this.newCityName.trim());
    }
  }

  // Open the Barangay modal
  showAddBarangayDialog() {
    if (!this.newPawner.cityId) {
      this.toastService.showWarning('Validation Error', 'Please select a city first');
      return;
    }

    this.showAddBarangayModal = true;
    this.newBarangayName = '';
    setTimeout(() => {
      const barangayInput = document.querySelector('#barangayNameInput') as HTMLInputElement;
      if (barangayInput) {
        barangayInput.focus();
      }
    }, 100);
  }

  // Close the Barangay modal
  closeAddBarangayModal() {
    this.showAddBarangayModal = false;
  }

  // Submit the new barangay
  submitNewBarangay() {
    if (this.newBarangayName && this.newBarangayName.trim() && this.newPawner.cityId) {
      this.isAddingBarangay = true;
      this.addNewBarangay(this.newBarangayName.trim(), this.newPawner.cityId);
    }
  }

  // Get the name of the selected city for display in the barangay modal
  getSelectedCityName() {
    const city = this.cities.find(c => c.id === this.newPawner.cityId);
    return city ? city.name : 'Unknown';
  }

  addNewCity(name: string) {
    this.addressService.createCity({ name, isActive: true }).subscribe({
      next: (response) => {
        this.isAddingCity = false;
        if (response.success) {
          this.cities.push(response.data);
          this.newPawner.cityId = response.data.id;
          this.toastService.showSuccess('Success', `City "${name}" added successfully`);
          this.showAddCityModal = false;
        } else {
          this.toastService.showError('Error', response.message || 'Failed to add city');
        }
      },
      error: (error) => {
        this.isAddingCity = false;
        console.error('Error adding city:', error);
        this.toastService.showError('Error', 'Failed to add city');
      }
    });
  }

  addNewBarangay(name: string, cityId: number) {
    this.addressService.createBarangay({ name, cityId: cityId, isActive: true }).subscribe({
      next: (response) => {
        this.isAddingBarangay = false;
        if (response.success) {
          this.filteredBarangays.push(response.data);
          this.newPawner.barangayId = response.data.id;
          this.toastService.showSuccess('Success', `Barangay "${name}" added successfully`);
          this.showAddBarangayModal = false;
        } else {
          this.toastService.showError('Error', response.message || 'Failed to add barangay');
        }
      },
      error: (error) => {
        this.isAddingBarangay = false;
        console.error('Error adding barangay:', error);
        this.toastService.showError('Error', 'Failed to add barangay');
      }
    });
  }

  // Show New Pawner modal
  showNewPawnerModal() {
    // Clear selected pawner
    this.selectedPawner = null;
    this.searchQuery = '';
    this.searchResults = [];

    // Reset new pawner form and ensure it's visible
    this.showCreatePawnerForm = true;
    this.newPawner = {
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      cityId: 0,
      barangayId: 0,
      addressDetails: ''
    };

    // Show the New Appraisal modal
    this.showNewAppraisalModal = true;
  }

  // Close New Appraisal modal
  closeNewAppraisalModal() {
    this.showNewAppraisalModal = false;
    this.showCreatePawnerForm = false;
    this.showItemForm = false;
    this.appraisalItems = [];

    // Always clear selected pawner when closing modal
    this.selectedPawner = null;
    this.searchQuery = '';
    this.searchResults = [];

    // Reset current item form
    this.currentItem = {
      pawnerId: 0,
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      notes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined,
      status: 'pending'
    };

    // Refresh dashboard data to show updated counts and recent appraisals
    this.loadRecentAppraisals();
  }



  // Get interest rate for category
  getInterestRateForCategory(categoryName: string): number {
    const category = this.categories.find(cat => cat.name === categoryName);
    return category ? category.interestRate : 0;
  }
}
