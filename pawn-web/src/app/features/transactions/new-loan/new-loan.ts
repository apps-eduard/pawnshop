import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { PawnerService } from '../../../core/services/pawner.service';
import { AppraisalService } from '../../../core/services/appraisal.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { AddressService } from '../../../core/services/address.service';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './new-loan.html',
  styleUrl: './new-loan.css'
})
export class NewLoan implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

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

  // City and Barangay data
  cities: { id: number; name: string }[] = [];
  barangays: { id: number; name: string }[] = [];

  // Modal states
  showCityModal = false;
  showBarangayModal = false;
  newCityName = '';
  newBarangayName = '';

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
    maturityDate: this.getDefaultMaturityDate(),
    expiryDate: this.getDefaultExpiryDate(),
    serviceCharge: 100 // Default service charge
  };

  // For currency input formatting
  loanAmountDisplay: string = '';
  private updateLoanAmountDisplay() {
    this.loanAmountDisplay = this.loanForm.loanAmount ? this.formatCurrency(this.loanForm.loanAmount) : '';
  }

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private pawnerService: PawnerService,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private addressService: AddressService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load categories
    this.loadCategories();
    
    // Load cities
    this.loadCities();
    
    // Initialize loan dates
    this.loanForm.loanDate = new Date().toISOString().split('T')[0];
    this.loanForm.maturityDate = this.getDefaultMaturityDate();

    // Initialize currency display
    this.updateLoanAmountDisplay();
  }

  loadCategories() {
    this.categoriesService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
        this.toastService.showError('Error', 'Failed to load categories');
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
    this.addressService.getCities().subscribe({
      next: (response) => {
        if (response.success) {
          this.cities = response.data.map(city => ({ id: city.id, name: city.name }));
          console.log('✅ Cities loaded:', this.cities);
        } else {
          this.toastService.showError('Error', 'Failed to load cities');
        }
      },
      error: (error) => {
        console.error('Error loading cities:', error);
        this.toastService.showError('Error', 'Failed to load cities');
      }
    });
  }

  onCityChange() {
    this.pawnerForm.barangayId = ''; // Reset barangay selection
    this.barangays = [];
    
    if (!this.pawnerForm.cityId) {
      return;
    }

    this.addressService.getBarangaysByCity(parseInt(this.pawnerForm.cityId)).subscribe({
      next: (response) => {
        if (response.success) {
          this.barangays = response.data.map(barangay => ({ id: barangay.id, name: barangay.name }));
          console.log('✅ Barangays loaded for city', this.pawnerForm.cityId, ':', this.barangays);
        } else {
          this.toastService.showError('Error', 'Failed to load barangays');
        }
      },
      error: (error) => {
        console.error('Error loading barangays:', error);
        this.toastService.showError('Error', 'Failed to load barangays');
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
    this.loanForm.interestRate = parseFloat(selectedCategory.interest_rate);
    
    // Load descriptions for the selected category
    this.isLoadingDescriptions = true;
    this.categoriesService.getCategoryDescriptions(selectedCategory.id).subscribe({
      next: (response) => {
        this.isLoadingDescriptions = false;
        if (response.success && response.data) {
          this.categoryDescriptions = response.data.map(desc => desc.description);
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
      
      // Reset form
      this.itemForm = {
        category: '',
        categoryDescription: '',
        description: '',
        appraisalValue: 0
      };
      
      // Update loan amount
      this.updateLoanAmount();
      
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
    
    return !!(this.itemForm.category && 
              this.itemForm.categoryDescription &&
              this.itemForm.description && 
              this.itemForm.appraisalValue > 0);
  }

  // Loan calculations and management
  updateLoanAmount() {
    this.loanForm.principalAmount = this.getTotalAppraisalValue();
  }

  getTotalAppraisalValue(): number {
    return this.selectedItems.reduce((total, item) => {
      const value = item.appraisalValue || item.estimatedValue || 0;
      return total + value;
    }, 0);
  }

  getInterestAmount(): number {
    return (this.loanForm.loanAmount * this.loanForm.interestRate) / 100;
  }

  getServiceCharge(): number {
    return this.loanForm.serviceCharge || 100;
  }

  getNetProceeds(): number {
    return this.loanForm.loanAmount - this.getInterestAmount() - this.getServiceCharge();
  }

  getDefaultMaturityDate(): string {
    const date = new Date();
    // Add 30 days for default maturity date
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  getDefaultExpiryDate(): string {
    const date = new Date();
    // Add 4 months for default expiry date
    date.setMonth(date.getMonth() + 4);
    return date.toISOString().split('T')[0];
  }

  // Currency formatting methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  onLoanAmountInput(event: any) {
    const input = event.target.value.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(input) || 0;
    this.loanForm.loanAmount = numValue;
    this.loanAmountDisplay = this.formatCurrency(numValue);
  }

  canCreateLoan(): boolean {
    return !!(this.selectedPawner && 
              this.selectedItems.length > 0 &&
              this.loanForm.loanAmount > 0 &&
              this.loanForm.loanDate &&
              this.loanForm.maturityDate);
  }

  resetForm() {
    // Reset loan form
    this.loanForm = {
      principalAmount: 0,
      loanAmount: 0,
      interestRate: 0,
      transactionDate: new Date().toISOString().split('T')[0],
      loanDate: new Date().toISOString().split('T')[0],
      maturityDate: this.getDefaultMaturityDate(),
      expiryDate: this.getDefaultExpiryDate(),
      serviceCharge: 100
    };
    
    // Reset items
    this.selectedItems = [];
    this.selectedAppraisal = null;
    
    // Reset currency display
    this.updateLoanAmountDisplay();
    
    this.toastService.showInfo('Reset', 'Form has been reset');
  }

  goBack() {
    this.location.back();
  }

  createLoan() {
    if (!this.canCreateLoan()) {
      this.toastService.showWarning('Validation', 'Please complete all required fields');
      return;
    }
    
    // TODO: Implement actual loan creation logic
    // This would involve calling a service to save the loan data
    
    this.toastService.showSuccess('Success', 'New loan created successfully');
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
    this.barangays = [];
  }

  // Modal management methods
  showAddCityModal() {
    this.showCityModal = true;
    this.newCityName = '';
  }

  closeCityModal() {
    this.showCityModal = false;
    this.newCityName = '';
  }

  showAddBarangayModal() {
    if (!this.pawnerForm.cityId) {
      this.toastService.showWarning('Validation', 'Please select a city first');
      return;
    }
    this.showBarangayModal = true;
    this.newBarangayName = '';
  }

  closeBarangayModal() {
    this.showBarangayModal = false;
    this.newBarangayName = '';
  }

  getSelectedCityName(): string {
    const selectedCity = this.cities.find(city => city.id.toString() === this.pawnerForm.cityId);
    return selectedCity ? selectedCity.name : 'No city selected';
  }

  addNewCity() {
    if (!this.newCityName?.trim()) {
      this.toastService.showWarning('Validation', 'Please enter a city name');
      return;
    }

    const cityData = {
      name: this.newCityName.trim(),
      isActive: true
    };

    this.addressService.createCity(cityData).subscribe({
      next: (response) => {
        if (response.success) {
          // Add the new city to the list
          this.cities.push({ id: response.data.id, name: response.data.name });
          // Select the newly added city
          this.pawnerForm.cityId = response.data.id.toString();
          // Clear barangays since city changed
          this.barangays = [];
          this.pawnerForm.barangayId = '';
          // Load barangays for the new city
          this.onCityChange();
          
          this.toastService.showSuccess('Success', 'City added successfully');
          this.closeCityModal();
        } else {
          this.toastService.showError('Error', response.message || 'Failed to add city');
        }
      },
      error: (error) => {
        console.error('Error adding city:', error);
        this.toastService.showError('Error', 'Failed to add city');
      }
    });
  }

  addNewBarangay() {
    if (!this.newBarangayName?.trim()) {
      this.toastService.showWarning('Validation', 'Please enter a barangay name');
      return;
    }

    if (!this.pawnerForm.cityId) {
      this.toastService.showWarning('Validation', 'Please select a city first');
      return;
    }

    const barangayData = {
      name: this.newBarangayName.trim(),
      cityId: parseInt(this.pawnerForm.cityId),
      isActive: true
    };

    this.addressService.createBarangay(barangayData).subscribe({
      next: (response) => {
        if (response.success) {
          // Add the new barangay to the list
          this.barangays.push({ id: response.data.id, name: response.data.name });
          // Select the newly added barangay
          this.pawnerForm.barangayId = response.data.id.toString();
          
          this.toastService.showSuccess('Success', 'Barangay added successfully');
          this.closeBarangayModal();
        } else {
          this.toastService.showError('Error', response.message || 'Failed to add barangay');
        }
      },
      error: (error) => {
        console.error('Error adding barangay:', error);
        this.toastService.showError('Error', 'Failed to add barangay');
      }
    });
  }

}
