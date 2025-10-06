import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { PawnerService } from '../../../core/services/pawner.service';
import { AppraisalService } from '../../../core/services/appraisal.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { AddressService } from '../../../core/services/address.service';
import { ModalService } from '../../../shared/services/modal.service';
import { AddCityModalComponent } from '../../../shared/modals/add-city-modal/add-city-modal.component';
import { AddBarangayModalComponent } from '../../../shared/modals/add-barangay-modal/add-barangay-modal.component';
import { AddCategoryDescriptionModalComponent } from '../../../shared/modals/add-category-description-modal/add-category-description-modal.component';
import { InvoiceModalComponent } from '../../../shared/modals/invoice-modal/invoice-modal.component';
import { LoanInvoiceData } from '../../../shared/components/loan-invoice/loan-invoice.component';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { HttpClient } from '@angular/common/http';

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
  pawnerId?: number;
  category: string;
  categoryDescription?: string;
  description: string;
  estimatedValue: number;
  appraisalValue?: number;
  serialNumber?: string;
  notes?: string;
  weight?: number;
  karat?: number;
  status?: string;
}

interface ItemForm {
  category: string;
  categoryDescription: string;
  description: string;
  appraisalValue: number;
}

interface LoanForm {
  principalAmount: number;
  loanAmount: number;
  interestRate: number;
  transactionDate: Date | string;
  loanDate: Date | string;
  maturityDate: Date | string;
  expiryDate: Date | string;
  serviceCharge: number;
}

@Component({
  selector: 'app-new-loan',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddCityModalComponent,
    AddBarangayModalComponent,
    AddCategoryDescriptionModalComponent,
    InvoiceModalComponent,
    CurrencyInputDirective
  ],
  templateUrl: './new-loan.html',
  styleUrl: './new-loan.css'
})
export class NewLoan implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('categoryDescriptionSelect') categoryDescriptionSelect!: ElementRef<HTMLSelectElement>;
  @ViewChild('principalLoanInput', { read: CurrencyInputDirective }) principalLoanDirective!: CurrencyInputDirective;
  @ViewChild('appraisalValueInput', { read: CurrencyInputDirective }) appraisalValueDirective!: CurrencyInputDirective;

  // Lifecycle management
  private destroy$ = new Subject<void>();

  // Date Management - Add flag to control auto-calculation
  autoCalculateDates = true;

  // Search & Pawner Management
  searchQuery = '';
  isSearching = false;
  pawners: Pawner[] = [];
  selectedPawner: Pawner | null = null;

  // Pawner Form for manual input
  pawnerForm = {
    firstName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    cityId: '',
    barangayId: '',
    addressDetails: ''
  };

  // Track which fields have been touched to show validation
  touchedFields = {
    pawner: {
      firstName: false,
      lastName: false,
      contactNumber: false,
      email: false,
      cityId: false,
      barangayId: false,
      addressDetails: false
    },
    item: {
      category: false,
      categoryDescription: false,
      description: false,
      appraisalValue: false
    }
  };

  // City and Barangay data
  cities: { id: number; name: string }[] = [];
  barangays: { id: number; name: string }[] = [];

  // Old modal states removed - now using ModalService

  // Item/Appraisal Management
  appraisalSearchQuery = '';
  appraisalResults: AppraisalItem[] = [];
  selectedAppraisal: AppraisalItem | null = null;
  selectedItems: AppraisalItem[] = [];
  categories: Category[] = [];
  categoryDescriptions: string[] = [];
  isLoadingDescriptions: boolean = false;

  // Forms
  itemForm: ItemForm = {
    category: '',
    categoryDescription: '',
    description: '',
    appraisalValue: 0
  };

  loanForm: LoanForm = {
    principalAmount: 0,
    loanAmount: 0,
    interestRate: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    loanDate: new Date().toISOString().split('T')[0],
    maturityDate: '', // Will be set after initialization
    expiryDate: '', // Will be set after initialization
    serviceCharge: 0 // Will be calculated automatically
  };

  // Dynamic service charge properties
  calculatedServiceCharge: number = 0;
  serviceChargeDetails: any = null;

  // Invoice modal state
  showInvoiceModal: boolean = false;
  invoiceData: LoanInvoiceData | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private toastService: ToastService,
    private pawnerService: PawnerService,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private addressService: AddressService,
    private modalService: ModalService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Check if we're coming from a pending appraisal
    console.log('🔍 New Loan ngOnInit - checking for appraisal data...');

    // Try to get navigation state from router first
    const navigation = this.router.getCurrentNavigation();
    console.log('🔍 Navigation object:', navigation);

    // Try to get state from history.state as backup
    const historyState = window.history.state;
    console.log('🔍 History state:', historyState);

    let appraisalData = null;
    let fromAppraisal = false;

    // Check navigation state first
    if (navigation?.extras.state?.['fromAppraisal']) {
      fromAppraisal = true;
      appraisalData = navigation.extras.state['appraisalData'];
      console.log('✅ Found appraisal data in navigation state');
    }
    // Check history state as fallback
    else if (historyState?.fromAppraisal) {
      fromAppraisal = true;
      appraisalData = historyState.appraisalData;
      console.log('✅ Found appraisal data in history state');
    }

    if (fromAppraisal && appraisalData) {
      console.log('🔄 Loading New Loan page with appraisal data:', appraisalData);
      setTimeout(() => {
        this.loadAppraisalDataForLoan(appraisalData);
      }, 500); // Small delay to ensure categories are loaded first
    } else {
      console.log('⚠️ No appraisal data found in navigation or history state');
    }

    // Load categories
    this.loadCategories();

    // Load cities
    this.loadCities();

    // Initialize loan dates
    this.loanForm.loanDate = new Date().toISOString().split('T')[0];
    this.loanForm.maturityDate = this.getDefaultMaturityDate();
    this.loanForm.expiryDate = this.getDefaultExpiryDate();

    // Set autofocus on search input after view initialization (unless we have appraisal data)
    if (!navigation?.extras.state?.['fromAppraisal']) {
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 100);
    }

    // Subscribe to modal results
    this.setupModalSubscriptions();
  }

  ngOnDestroy() {
    // Clean up all subscriptions to prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();

    // Clear any pending timeouts
    if (this.searchInput) {
      this.searchInput.nativeElement.blur();
    }

    // Clear arrays to free memory
    this.pawners = [];
    this.appraisalResults = [];
    this.selectedItems = [];
    this.categories = [];
    this.categoryDescriptions = [];
    this.cities = [];
  }

  // Load appraisal data to pre-populate the new loan form
  loadAppraisalDataForLoan(appraisalData: any) {
    console.log('📋 Loading appraisal data for new loan:', appraisalData);

    // First, we need to get the full pawner details
    if (appraisalData.pawnerId) {
      this.pawnerService.getPawner(appraisalData.pawnerId).subscribe({
        next: (response: any) => {
          if (response.success) {
            const pawnerData = response.data;
            console.log('👤 Pawner data loaded:', pawnerData);

            // Populate pawner information
            this.selectedPawner = {
              id: pawnerData.id,
              firstName: pawnerData.first_name || pawnerData.firstName,
              lastName: pawnerData.last_name || pawnerData.lastName,
              contactNumber: pawnerData.mobile_number || pawnerData.contactNumber,
              email: pawnerData.email,
              cityId: pawnerData.city_id,
              barangayId: pawnerData.barangay_id,
              addressDetails: pawnerData.house_number && pawnerData.street ?
                `${pawnerData.house_number} ${pawnerData.street}` : pawnerData.address_details,
              cityName: pawnerData.city_name,
              barangayName: pawnerData.barangay_name
            };

            console.log('✅ Pawner information populated');
          }
        },
        error: (error: any) => {
          console.error('❌ Error loading pawner data:', error);
          this.toastService.showError('Error', 'Failed to load pawner information');
        }
      });
    }

    // Populate item information from appraisal
    this.selectedItems = [{
      category: appraisalData.category || '',
      categoryDescription: '',
      description: appraisalData.description || appraisalData.itemType || '',
      estimatedValue: appraisalData.totalAppraisedValue || 0,
      serialNumber: '',
      notes: `From appraisal ID: ${appraisalData.id}`,
      weight: 0,
      karat: 0
    }];

    // Set loan form with suggested values
    this.loanForm.principalAmount = appraisalData.totalAppraisedValue || 0;
    this.loanForm.loanAmount = this.loanForm.principalAmount;

    // Calculate interest rate based on category if available
    if (appraisalData.category) {
      const category = this.categories.find(cat => cat.name === appraisalData.category);
      if (category) {
        this.loanForm.interestRate = Number(category.interest_rate) || 3.5;
      }
    }

    // Calculate service charge for the loaded appraisal
    this.calculateServiceCharge(this.loanForm.loanAmount);

    console.log('✅ Appraisal data loaded successfully for new loan');
    this.toastService.showSuccess('Success', 'Appraisal data loaded! Please review and complete the loan details.');
    this.barangays = [];
  }

  // Test method to manually load sample appraisal data (for debugging)
  testLoadAppraisalData() {
    console.log('🧪 Testing appraisal data loading...');
    const sampleAppraisal = {
      id: 1,
      pawnerId: 1,
      pawnerName: 'John Doe',
      category: 'Jewelry',
      itemType: 'Gold Ring',
      description: 'Gold Ring - 18k',
      totalAppraisedValue: 15000,
      status: 'completed',
      createdAt: new Date()
    };
    this.loadAppraisalDataForLoan(sampleAppraisal);
  }

  private setupModalSubscriptions() {
    // City modal result subscription
    this.modalService.cityModalResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.success && result.data) {
        // Refresh city list to get the new city
        this.loadCities();

        // Auto-select the newly added city (will need to wait for list to load)
        setTimeout(() => {
          const newCity = this.cities.find(city => city.name === result.data!.name);
          if (newCity) {
            this.pawnerForm.cityId = newCity.id.toString();
            // Clear barangays since city changed
            this.barangays = [];
            this.pawnerForm.barangayId = '';
            // Load barangays for the new city
            this.onCityChange();
          }
        }, 100);
      }
    });

    // Barangay modal result subscription
    this.modalService.barangayModalResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.success && result.data) {
        // Refresh barangay list for the selected city
        this.onCityChange();

        // Auto-select the newly added barangay (will need to wait for list to load)
        setTimeout(() => {
          const newBarangay = this.barangays.find(barangay => barangay.name === result.data!.name);
          if (newBarangay) {
            this.pawnerForm.barangayId = newBarangay.id.toString();
          }
        }, 100);
      }
    });

    // Category description modal result subscription
    this.modalService.categoryDescriptionModalResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.success) {
        this.itemForm.categoryDescription = result.data?.description || '';
        this.onCategoryChange(); // Refresh category descriptions
      }
    });
  }

  loadCategories() {
    console.log('🔄 Loading categories for New Loan...');
    this.categoriesService.getCategories().subscribe({
      next: (response) => {
        console.log('📊 Categories response:', response);
        if (response.success && response.data) {
          this.categories = response.data;
          console.log('✅ Categories loaded successfully:', this.categories.length, 'categories');
        } else {
          console.warn('⚠️ Categories response not successful:', response);
          this.toastService.showWarning('Warning', 'Categories data format unexpected');
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading categories:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        this.toastService.showError('Error', 'Failed to load categories - check backend connection');
      }
    });
  }

  // Pawner search functionality
  onSearchInput() {
    if (this.searchQuery.length >= 3) {
      this.searchPawners();
    } else {
      this.pawners = [];
    }
  }

  searchPawners() {
    this.isSearching = true;

    this.pawnerService.searchPawners(this.searchQuery).subscribe({
      next: (response) => {
        this.isSearching = false;
        if (response.success) {
          this.pawners = response.data;
        } else {
          this.pawners = [];
          this.toastService.showError('Search Error', response.message);
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error searching pawners:', error);
        this.toastService.showError('Search Error', 'Failed to search pawners');
        this.pawners = [];
      }
    });
  }

  selectPawner(pawner: Pawner) {
    this.selectedPawner = pawner;
    this.searchQuery = `${pawner.firstName} ${pawner.lastName}`;
    this.pawners = []; // Clear search results
  }

  changePawner() {
    this.selectedPawner = null;
    this.searchQuery = '';
    this.resetPawnerForm();
    if (this.searchInput) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      });
    }
  }

  // City and Barangay management
  loadCities() {
    console.log('🔄 Loading cities for New Loan...');
    this.addressService.getCities().subscribe({
      next: (response) => {
        console.log('🏙️ Cities response:', response);
        if (response.success && response.data) {
          this.cities = response.data.map(city => ({ id: city.id, name: city.name }));
          console.log('✅ Cities loaded successfully:', this.cities.length, 'cities');
        } else {
          console.warn('⚠️ Cities response not successful:', response);
          this.toastService.showError('Error', 'Failed to load cities - unexpected response format');
        }
      },
      error: (error) => {
        console.error('❌ Error loading cities:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        this.toastService.showError('Error', 'Failed to load cities - check backend connection');
      }
    });
  }

  onCityChange() {
    console.log('🏙️ City changed to:', this.pawnerForm.cityId);
    this.pawnerForm.barangayId = ''; // Reset barangay selection
    this.barangays = [];

    if (!this.pawnerForm.cityId) {
      console.log('⚠️ No city selected, skipping barangay load');
      return;
    }

    const cityId = parseInt(this.pawnerForm.cityId);
    console.log('🔄 Loading barangays for city ID:', cityId);

    this.addressService.getBarangaysByCity(cityId).subscribe({
      next: (response) => {
        console.log('🏘️ Barangays response:', response);
        if (response.success && response.data) {
          this.barangays = response.data.map(barangay => ({ id: barangay.id, name: barangay.name }));
          console.log('✅ Barangays loaded for city', this.pawnerForm.cityId, ':', this.barangays.length, 'barangays');
        } else {
          console.warn('⚠️ Barangays response not successful:', response);
          this.toastService.showError('Error', 'Failed to load barangays - unexpected response format');
        }
      },
      error: (error) => {
        console.error('❌ Error loading barangays:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });

        this.toastService.showError('Error', 'Failed to load barangays - check backend connection');
      }
    });
  }

  // Appraisal search and item management
  searchAppraisals() {
    if (!this.appraisalSearchQuery || this.appraisalSearchQuery.length < 2) {
      this.toastService.showWarning('Search', 'Please enter at least 2 characters');
      return;
    }

    this.appraisalService.searchAppraisals(this.appraisalSearchQuery).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.appraisalResults = response.data.map((item: any) => ({
            id: item.id,
            pawnerId: item.pawnerId,
            category: item.category,
            categoryDescription: item.categoryDescription,
            description: item.description,
            estimatedValue: item.appraisedValue || item.estimatedValue,
            serialNumber: item.serialNumber,
            notes: item.notes,
            weight: item.weight,
            karat: item.karat,
            status: item.status
          }));

          if (this.appraisalResults.length === 0) {
            this.toastService.showInfo('Search', 'No appraisals found');
          }
        } else {
          this.toastService.showError('Search Error', response.message);
        }
      },
      error: (error: any) => {
        console.error('Error searching appraisals:', error);
        this.toastService.showError('Search Error', 'Failed to search appraisals');
      }
    });
  }

  selectAppraisal(appraisal: AppraisalItem) {
    this.selectedAppraisal = appraisal;
    this.appraisalResults = [];
  }

  onCategoryChange() {
    // Reset description
    this.itemForm.categoryDescription = '';
    this.categoryDescriptions = [];

    if (!this.itemForm.category) {
      this.loanForm.interestRate = 0;
      return;
    }

    // Find category ID based on selected category name
    const selectedCategory = this.categories.find(cat => cat.name === this.itemForm.category);
    if (!selectedCategory) {
      this.loanForm.interestRate = 0;
      return;
    }

    // Set interest rate from selected category
    const interestRateValue = parseFloat(selectedCategory.interest_rate);
    this.loanForm.interestRate = interestRateValue;

    console.log('🔍 Category selected:', selectedCategory.name);
    console.log('💾 Database interest_rate value:', selectedCategory.interest_rate);
    console.log('🔢 Parsed interest rate:', interestRateValue);
    console.log('📊 Final loanForm.interestRate:', this.loanForm.interestRate);

    // Load descriptions for the selected category
    this.isLoadingDescriptions = true;
    this.categoriesService.getCategoryDescriptions(selectedCategory.id).subscribe({
      next: (response) => {
        this.isLoadingDescriptions = false;
        if (response.success && response.data) {
          this.categoryDescriptions = response.data.map(desc => desc.description_name);
          console.log('📝 Loaded category descriptions:', this.categoryDescriptions);
        } else {
          this.categoryDescriptions = [];
          this.toastService.showError('Error', 'Failed to load category descriptions');
        }
      },
      error: (error) => {
        this.isLoadingDescriptions = false;
        console.error('Error loading category descriptions:', error);
        this.toastService.showError('Error', 'Failed to load category descriptions');
        this.categoryDescriptions = [];
      }
    });
  }

  addItem() {
    if (this.selectedAppraisal) {
      // Add from selected appraisal
      this.selectedItems.push({...this.selectedAppraisal});
      this.selectedAppraisal = null;
      this.appraisalSearchQuery = '';

      // Update loan amount
      this.updateLoanAmount();

      this.toastService.showSuccess('Success', 'Item added to loan');
    } else if (this.canAddItem()) {
      // Add from manual entry
      const newItem: AppraisalItem = {
        category: this.itemForm.category,
        categoryDescription: this.itemForm.categoryDescription,
        description: this.itemForm.description,
        estimatedValue: this.itemForm.appraisalValue,
        appraisalValue: this.itemForm.appraisalValue
      };

      this.selectedItems.push(newItem);

      // Reset only description and appraisal value, keep category and categoryDescription
      this.itemForm.categoryDescription = '';
      this.itemForm.description = '';
      this.itemForm.appraisalValue = 0;

      // Update loan amount
      this.updateLoanAmount();

      // Reset appraisal value input field to show 0.00
      setTimeout(() => {
        if (this.appraisalValueDirective) {
          this.appraisalValueDirective.setValue(0);
        }
        if (this.categoryDescriptionSelect) {
          this.categoryDescriptionSelect.nativeElement.focus();
        }
      }, 100);

      this.toastService.showSuccess('Success', 'Item added to loan');
    }
  }

  removeItem(index: number) {
    if (index >= 0 && index < this.selectedItems.length) {
      this.selectedItems.splice(index, 1);

      // Update loan amount
      this.updateLoanAmount();

      this.toastService.showInfo('Info', 'Item removed');
    }
  }

  canAddItem(): boolean {
    if (this.selectedAppraisal) {
      return true;
    }

    // Updated validation: category, categoryDescription, appraisalValue > 0 required (description removed)
    return !!(this.itemForm.category &&
              this.itemForm.categoryDescription &&
              this.itemForm.appraisalValue > 0);
  }

  // Check if item form fields are required based on whether we have added items
  areItemFieldsRequired(): boolean {
    // If we already have items added, item details are not required for validation
    return this.selectedItems.length === 0;
  }

  // Check if item form field is invalid for validation display
  isItemFieldInvalid(fieldName: string): boolean {
    const fieldKey = fieldName as keyof typeof this.touchedFields.item;

    // Only show validation if fields are required (no items added yet) AND field has been touched
    if (!this.areItemFieldsRequired() || !this.touchedFields.item[fieldKey]) {
      return false;
    }

    switch (fieldName) {
      case 'category':
        return !this.itemForm.category;
      case 'categoryDescription':
        return !this.itemForm.categoryDescription;
      case 'description':
        return false; // Description is no longer required
      case 'appraisalValue':
        return this.itemForm.appraisalValue <= 0;
      default:
        return false;
    }
  }

  // Mark item field as touched
  markItemFieldTouched(fieldName: string): void {
    const fieldKey = fieldName as keyof typeof this.touchedFields.item;
    if (this.touchedFields.item.hasOwnProperty(fieldKey)) {
      this.touchedFields.item[fieldKey] = true;
    }
  }

  isCategoryDisabled(): boolean {
    return this.selectedItems && this.selectedItems.length > 0;
  }

  isCategoryDescriptionDisabled(): boolean {
    return !this.itemForm.category || this.isLoadingDescriptions;
  }

  // Loan calculations and management
  updateLoanAmount() {
    this.loanForm.principalAmount = this.getTotalAppraisalValue();
    this.loanForm.loanAmount = this.loanForm.principalAmount;
    // Recalculate service charge when loan amount is updated from items
    this.calculateServiceCharge(this.loanForm.loanAmount);
  }

  getTotalAppraisalValue(): number {
    return this.selectedItems.reduce((total, item) => {
      const value = item.appraisalValue || item.estimatedValue || 0;
      return total + value;
    }, 0);
  }

  getMaxPrincipalLoan(): number {
    return this.getTotalAppraisalValue();
  }

  getInterestAmount(): number {
    return (this.loanForm.loanAmount * this.loanForm.interestRate) / 100;
  }

  getServiceCharge(): number {
    // Return cached service charge or 0 if not calculated yet
    return this.calculatedServiceCharge || 0;
  }

  // Dynamic service charge calculation using backend API
  async calculateServiceCharge(principalAmount: number): Promise<void> {
    if (principalAmount <= 0) {
      this.calculatedServiceCharge = 0;
      return;
    }

    try {
      const response = await this.http.post<any>('http://localhost:3000/api/service-charge-config/calculate', {
        principalAmount: principalAmount
      }).toPromise();

      if (response.success) {
        this.calculatedServiceCharge = response.data.serviceChargeAmount;
        this.serviceChargeDetails = response.data;
        console.log(`💰 Service charge calculated: ₱${this.calculatedServiceCharge} (${response.data.calculationMethod})`);
      } else {
        console.error('Service charge calculation failed:', response.message);
        this.fallbackServiceChargeCalculation(principalAmount);
      }
    } catch (error) {
      console.error('Error calculating service charge:', error);
      this.fallbackServiceChargeCalculation(principalAmount);
    }
  }

  // Fallback service charge calculation (in case API is unavailable)
  private fallbackServiceChargeCalculation(principalAmount: number): void {
    let serviceCharge = 0;
    if (principalAmount <= 100) serviceCharge = 1;
    else if (principalAmount <= 200) serviceCharge = 2;
    else if (principalAmount <= 300) serviceCharge = 3;
    else if (principalAmount <= 400) serviceCharge = 4;
    else serviceCharge = 5;

    this.calculatedServiceCharge = serviceCharge;
    console.log(`⚠️ Using fallback service charge: ₱${serviceCharge}`);
  }

  getNetProceeds(): number {
    return this.loanForm.loanAmount - this.getInterestAmount() - this.getServiceCharge();
  }

  getDefaultMaturityDate(): string {
    if (!this.loanForm?.loanDate) {
      return '';
    }
    const date = new Date(this.loanForm.loanDate);
    // Add 1 month for maturity date
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  }

  getDefaultExpiryDate(): string {
    if (!this.loanForm?.loanDate) {
      return '';
    }
    const date = new Date(this.loanForm.loanDate);
    // Add 4 months for expiry date (from loan date, not maturity date)
    date.setMonth(date.getMonth() + 4);
    return date.toISOString().split('T')[0];
  }

  // Handle transaction date change - sync to loan date and auto-calculate maturity and expiry if enabled
  onTransactionDateChange() {
    if (this.autoCalculateDates) {
      // Transaction date should sync to loan date (Date Granted)
      this.loanForm.loanDate = this.loanForm.transactionDate;
      this.loanForm.maturityDate = this.getDefaultMaturityDate();
      this.loanForm.expiryDate = this.getDefaultExpiryDate();
    }
  }

  // Handle loan date change - auto-calculate maturity and expiry if enabled
  onLoanDateChange() {
    if (this.autoCalculateDates) {
      this.loanForm.maturityDate = this.getDefaultMaturityDate();
      this.loanForm.expiryDate = this.getDefaultExpiryDate();
    }
  }

  // Handle maturity date change - auto-calculate expiry if enabled
  onMaturityDateChange() {
    if (this.autoCalculateDates) {
      this.loanForm.expiryDate = this.getDefaultExpiryDate();
    }
  }

  // Currency formatting methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }



  // Principal loan amount change handler
  onPrincipalLoanChange(value: number) {
    this.loanForm.loanAmount = value;
    // Recalculate service charge when loan amount changes
    this.calculateServiceCharge(value);
  }

  // Appraisal value change handler
  onAppraisalValueChange(value: number) {
    this.itemForm.appraisalValue = value;
  }

  canCreateLoan(): boolean {
    // Check if pawner is valid (either selected or new pawner form is complete)
    const pawnerValid = this.isPawnerValid();

    // Check if we have added items
    const hasItems = this.selectedItems.length > 0;

    // Check if principal loan is greater than 0
    const principalLoanValid = this.loanForm.loanAmount > 0;

    // Check if net proceeds is greater than 0
    const netProceedsValid = this.getNetProceeds() > 0;

    // Check if required dates are set
    const datesValid = !!(this.loanForm.loanDate && this.loanForm.maturityDate);

    return pawnerValid && hasItems && principalLoanValid && netProceedsValid && datesValid;
  }

  resetForm() {
    // Reset loan form to pristine state
    this.loanForm = {
      principalAmount: 0,
      loanAmount: 0,
      interestRate: 0,
      transactionDate: new Date().toISOString().split('T')[0],
      loanDate: new Date().toISOString().split('T')[0],
      maturityDate: this.getDefaultMaturityDate(),
      expiryDate: this.getDefaultExpiryDate(),
      serviceCharge: 0
    };

    // Reset all item-related data
    this.selectedItems = [];
    this.selectedAppraisal = null;
    this.appraisalResults = [];
    this.appraisalSearchQuery = '';

    // Reset item form to pristine state
    this.itemForm = {
      category: '',
      categoryDescription: '',
      description: '',
      appraisalValue: 0
    };

    // Reset category descriptions
    this.categoryDescriptions = [];
    this.isLoadingDescriptions = false;

    // Reset pawner selection and search
    this.selectedPawner = null;
    this.searchQuery = '';
    this.pawners = [];
    this.isSearching = false;

    // Reset pawner form to pristine state
    this.resetPawnerForm();

    // Reset barangays when city is cleared
    this.barangays = [];

    // Reset all touched states to pristine
    this.touchedFields = {
      pawner: {
        firstName: false,
        lastName: false,
        contactNumber: false,
        email: false,
        cityId: false,
        barangayId: false,
        addressDetails: false
      },
      item: {
        category: false,
        categoryDescription: false,
        description: false,
        appraisalValue: false
      }
    };

    // Reset currency input fields to show 0.00 and clear validation states
    setTimeout(() => {
      if (this.principalLoanDirective) {
        this.principalLoanDirective.setValue(0);
      }
      if (this.appraisalValueDirective) {
        this.appraisalValueDirective.setValue(0);
      }

      // Focus on search input for pawner after reset
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);

    this.toastService.showInfo('Reset', 'All form data has been reset to pristine state');
  }

  goBack() {
    this.location.back();
  }

  createLoan() {
    if (!this.canCreateLoan()) {
      this.toastService.showWarning('Validation', 'Please complete all required fields');
      return;
    }

    // Prepare loan data for API
    const loanData = {
      pawnerData: this.selectedPawner || {
        firstName: this.pawnerForm.firstName,
        lastName: this.pawnerForm.lastName,
        contactNumber: this.pawnerForm.contactNumber,
        email: this.pawnerForm.email || null,
        cityId: parseInt(this.pawnerForm.cityId as string),
        barangayId: parseInt(this.pawnerForm.barangayId as string),
        addressDetails: this.pawnerForm.addressDetails || ''
      },
      items: this.selectedItems.map(item => ({
        category: item.category,
        categoryDescription: item.categoryDescription,
        description: item.description || '',
        appraisalValue: item.appraisalValue
      })),
      loanData: {
        principalLoan: this.loanForm.loanAmount,
        interestRate: this.loanForm.interestRate,
        interestAmount: this.getInterestAmount(),
        serviceCharge: this.getServiceCharge(),
        netProceeds: this.getNetProceeds()
      },
      transactionDate: this.loanForm.transactionDate,
      loanDate: this.loanForm.loanDate,
      maturityDate: this.loanForm.maturityDate,
      expiryDate: this.loanForm.expiryDate,
      notes: 'New loan created from frontend'
    };

    console.log('🔄 Creating new loan with data:', loanData);

    // Call API to create loan
    this.http.post('http://localhost:3000/api/transactions/new-loan', loanData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastService.showSuccess('Success', `New loan created successfully! Ticket: ${response.data.ticketNumber}`);

          // Prepare invoice data
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const pawnerData = this.selectedPawner || {
            firstName: this.pawnerForm.firstName,
            lastName: this.pawnerForm.lastName,
            contactNumber: this.pawnerForm.contactNumber
          };

          this.invoiceData = {
            transactionType: 'new_loan',
            transactionNumber: response.data.transactionId || 'N/A',
            ticketNumber: response.data.ticketNumber,
            transactionDate: new Date(this.loanForm.transactionDate),
            pawnerName: `${pawnerData.firstName} ${pawnerData.lastName}`,
            pawnerContact: pawnerData.contactNumber,
            pawnerAddress: this.getFullAddress(),
            items: this.selectedItems.map(item => ({
              category: item.category,
              description: item.description,
              appraisedValue: item.appraisalValue || 0
            })),
            principalAmount: this.loanForm.loanAmount,
            interestRate: this.loanForm.interestRate,
            interestAmount: this.getInterestAmount(),
            serviceCharge: this.getServiceCharge(),
            netProceeds: this.getNetProceeds(),
            totalAmount: this.loanForm.loanAmount + this.getInterestAmount() + this.getServiceCharge(),
            loanDate: new Date(this.loanForm.loanDate),
            maturityDate: new Date(this.loanForm.maturityDate),
            expiryDate: new Date(this.loanForm.expiryDate),
            branchName: user.branch_name || 'Main Branch',
            cashierName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            notes: 'Thank you for your business!'
          };

          // Show invoice modal
          this.showInvoiceModal = true;
        } else {
          this.toastService.showError('Error', response.message || 'Failed to create loan');
        }
      },
      error: (error) => {
        console.error('❌ Error creating loan:', error);
        this.toastService.showError('Error', error.error?.message || 'Failed to create loan');
      }
    });
  }

  // Helper method to get full address
  getFullAddress(): string {
    if (this.selectedPawner) {
      const parts = [];
      if (this.selectedPawner.addressDetails) parts.push(this.selectedPawner.addressDetails);
      if (this.selectedPawner.barangayName) parts.push(this.selectedPawner.barangayName);
      if (this.selectedPawner.cityName) parts.push(this.selectedPawner.cityName);
      return parts.join(', ') || 'N/A';
    } else {
      const parts = [];
      if (this.pawnerForm.addressDetails) parts.push(this.pawnerForm.addressDetails);
      const selectedBarangay = this.barangays.find(b => b.id === parseInt(this.pawnerForm.barangayId as string));
      const selectedCity = this.cities.find(c => c.id === parseInt(this.pawnerForm.cityId as string));
      if (selectedBarangay) parts.push(selectedBarangay.name);
      if (selectedCity) parts.push(selectedCity.name);
      return parts.join(', ') || 'N/A';
    }
  }

  // Close invoice modal and navigate back
  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceData = null;
    this.resetForm();
    this.goBack();
  }

  // Pawner form management
  canCreatePawner(): boolean {
    return !!(this.pawnerForm.firstName.trim() &&
              this.pawnerForm.lastName.trim() &&
              this.pawnerForm.contactNumber.trim() &&
              this.pawnerForm.cityId &&
              this.pawnerForm.barangayId);
  }

  // New pawner validation method
  isPawnerValid(): boolean {
    if (this.selectedPawner) {
      return true; // Selected pawner is always valid
    }

    // For new pawner, check required fields: fname, lname, contact, city, barangay
    return !!(this.pawnerForm.firstName.trim() &&
              this.pawnerForm.lastName.trim() &&
              this.pawnerForm.contactNumber.trim() &&
              this.pawnerForm.cityId &&
              this.pawnerForm.barangayId);
  }

  // Check if pawner form field is invalid for validation display
  isPawnerFieldInvalid(fieldName: string): boolean {
    const field = this.pawnerForm[fieldName as keyof typeof this.pawnerForm];
    const fieldKey = fieldName as keyof typeof this.touchedFields.pawner;

    // Only show validation if field has been touched and we're creating a new pawner
    if (!this.selectedPawner && this.touchedFields.pawner[fieldKey]) {
      switch (fieldName) {
        case 'firstName':
        case 'lastName':
        case 'contactNumber':
          return !field || (typeof field === 'string' && field.trim() === '');
        case 'cityId':
        case 'barangayId':
          return !field;
        default:
          return false;
      }
    }
    return false;
  }

  // Mark pawner field as touched
  markPawnerFieldTouched(fieldName: string): void {
    const fieldKey = fieldName as keyof typeof this.touchedFields.pawner;
    if (this.touchedFields.pawner.hasOwnProperty(fieldKey)) {
      this.touchedFields.pawner[fieldKey] = true;
    }
  }

  resetPawnerForm() {
    this.pawnerForm = {
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      cityId: '',
      barangayId: '',
      addressDetails: ''
    };
    // Clear barangays when pawner form is reset
    this.barangays = [];
  }

  // Modal management methods using ModalService
  showAddCityModal() {
    this.modalService.openCityModal({
      title: 'Add New City',
      placeholder: 'Enter city name...'
    });
  }

  showAddBarangayModal() {
    if (!this.pawnerForm.cityId) {
      this.toastService.showWarning('Validation', 'Please select a city first');
      return;
    }

    const selectedCity = this.cities.find(city => city.id.toString() === this.pawnerForm.cityId);
    if (!selectedCity) {
      this.toastService.showWarning('Error', 'Selected city not found');
      return;
    }

    this.modalService.openBarangayModal({
      title: 'Add New Barangay',
      placeholder: 'Enter barangay name...',
      selectedCityId: this.pawnerForm.cityId,
      selectedCityName: selectedCity.name
    });
  }

  showCategoryDescriptionModal() {
    if (!this.itemForm.category) {
      this.toastService.showWarning('Validation', 'Please select a category first');
      return;
    }

    const selectedCategory = this.categories.find(cat => cat.name === this.itemForm.category);
    if (!selectedCategory) {
      this.toastService.showWarning('Error', 'Selected category not found');
      return;
    }

    this.modalService.openCategoryDescriptionModal({
      title: 'Add Category Description',
      placeholder: 'Enter description...',
      selectedCategoryId: selectedCategory.id.toString(),
      selectedCategoryName: selectedCategory.name
    });
  }

}
