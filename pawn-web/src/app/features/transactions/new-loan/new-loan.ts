import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { PawnerService } from '../../../core/services/pawner.service';
import { AppraisalService } from '../../../core/services/appraisal.service';
import { CategoriesService } from '../../../core/services/categories.service';
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
  interestRate: number;
  loanDate: Date | string;
  maturityDate: Date | string;
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

  // Item/Appraisal Management
  appraisalSearchQuery = '';
  appraisalResults: AppraisalItem[] = [];
  selectedAppraisal: AppraisalItem | null = null;
  selectedItems: AppraisalItem[] = [];
  categories: { id: number, name: string }[] = [];
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
    interestRate: 3.5,
    loanDate: new Date().toISOString().split('T')[0],
    maturityDate: this.getDefaultMaturityDate(),
    serviceCharge: 100 // Default service charge
  };

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private pawnerService: PawnerService,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load categories
    this.loadCategories();
    
    // Initialize loan dates
    this.loanForm.loanDate = new Date().toISOString().split('T')[0];
    this.loanForm.maturityDate = this.getDefaultMaturityDate();
  }

  loadCategories() {
    this.categoriesService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = response.data.map(cat => ({
            id: cat.id,
            name: cat.name
          }));
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
    if (this.searchInput) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      });
    }
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
      return;
    }
    
    // Find category ID based on selected category name
    const selectedCategory = this.categories.find(cat => cat.name === this.itemForm.category);
    if (!selectedCategory) {
      return;
    }
    
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
    return (this.loanForm.principalAmount * this.loanForm.interestRate) / 100;
  }

  getServiceCharge(): number {
    return this.loanForm.serviceCharge || 100;
  }

  getNetProceeds(): number {
    return this.loanForm.principalAmount - this.getInterestAmount() - this.getServiceCharge();
  }

  getDefaultMaturityDate(): string {
    const date = new Date();
    // Add 30 days for default maturity date
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  canCreateLoan(): boolean {
    return !!(this.selectedPawner && 
              this.selectedItems.length > 0 &&
              this.loanForm.principalAmount > 0 &&
              this.loanForm.loanDate &&
              this.loanForm.maturityDate);
  }

  resetForm() {
    // Reset loan form
    this.loanForm = {
      principalAmount: 0,
      interestRate: 3.5,
      loanDate: new Date().toISOString().split('T')[0],
      maturityDate: this.getDefaultMaturityDate(),
      serviceCharge: 100
    };
    
    // Reset items
    this.selectedItems = [];
    this.selectedAppraisal = null;
    
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
}
