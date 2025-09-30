import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AppraisalService } from '../../core/services/appraisal.service';
import { PawnerService } from '../../core/services/pawner.service';
import { ItemService } from '../../core/services/item.service';
import { AddressService } from '../../core/services/address.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoriesService, Category } from '../../core/services/categories.service';
import { Appraisal, CreateAppraisalRequest } from '../../core/models/interfaces';

interface DashboardCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  route: string;
  amount?: number;
}

interface Transaction {
  id: string;
  type: 'new_loan' | 'payment' | 'renewal' | 'redemption';
  customer_name: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: Date;
}

@Component({
  selector: 'app-cashier-dashboard',
  templateUrl: './cashier-dashboard.html',
  styleUrl: './cashier-dashboard.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class CashierDashboard implements OnInit {
  @ViewChild('newPawnerModal') newPawnerModal: any;
  @ViewChild('cityInput') cityInput: any;
  @ViewChild('barangayInput') barangayInput: any;

  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  recentTransactions: Transaction[] = [];
  pendingAppraisals: Appraisal[] = [];
  
  // Appraisal mode toggle
  isAppraisalMode = false;

  // Appraisal functionality - only active when isAppraisalMode is true
  pawnerForm = {
    first_name: '',
    last_name: '',
    address: '',
    city: '',
    barangay: '',
    phone: '',
    email: '',
    birth_date: '',
    id_type: '',
    id_number: '',
    civil_status: 'Single',
    gender: 'Male',
    occupation: ''
  };

  itemForm = {
    name: '',
    description: '',
    category: '',
    appraised_value: null,
    interest_rate: 3.5
  };

  appraisalItems: any[] = [];
  selectedPawner: any = null;
  searchQuery = '';
  pawners: any[] = [];
  isCreatingAppraisal = false;
  showNewPawnerForm = false;
  categories: any[] = [];
  recentAppraisals: any[] = [];
  cities: any[] = [];
  barangays: any[] = [];
  filteredCities: any[] = [];
  filteredBarangays: any[] = [];
  isCityDropdownOpen = false;
  isBarangayDropdownOpen = false;
  
  // Transaction types
  transactionTypes = [
    {
      id: 'create_appraisal',
      title: 'Create Appraisal',
      description: 'Appraise items for pawning',
      icon: 'clipboard-list',
      color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
      iconColor: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'new_loan',
      title: 'New Loan',
      description: 'Create a new pawn loan',
      icon: 'plus',
      color: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'additional',
      title: 'Additional',
      description: 'Add additional loan amount',
      icon: 'plus-circle',
      color: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'partial',
      title: 'Partial Payment',
      description: 'Process partial payment',
      icon: 'credit-card',
      color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      id: 'redeem',
      title: 'Redeem',
      description: 'Process full redemption',
      icon: 'check-circle',
      color: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'renew',
      title: 'Renew',
      description: 'Renew existing loan',
      icon: 'refresh',
      color: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400'
    }
  ];

  constructor(
    private appraisalService: AppraisalService,
    private pawnerService: PawnerService,
    private itemService: ItemService,
    private addressService: AddressService,
    private toastService: ToastService,
    private categoriesService: CategoriesService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.loadPendingAppraisals();
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  private loadDashboardData() {
    this.isLoading = true;

    // Mock dashboard data for Cashier
    this.dashboardCards = [
      {
        title: 'Today\'s Loans',
        count: 12,
        icon: 'loans',
        color: 'blue',
        route: '/loans',
        amount: 180000
      },
      {
        title: 'Payments Received',
        count: 8,
        icon: 'payments',
        color: 'green',
        route: '/payments',
        amount: 75000
      },
      {
        title: 'Renewals',
        count: 5,
        icon: 'renewals',
        color: 'orange',
        route: '/renewals',
        amount: 45000
      },
      {
        title: 'Due Today',
        count: 3,
        icon: 'due',
        color: 'red',
        route: '/due-today',
        amount: 35000
      }
    ];

    // Mock recent transactions
    this.recentTransactions = [
      {
        id: 'TXN001',
        type: 'new_loan',
        customer_name: 'Maria Santos',
        amount: 25000,
        status: 'completed',
        created_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        id: 'TXN002',
        type: 'payment',
        customer_name: 'Juan Dela Cruz',
        amount: 15000,
        status: 'completed',
        created_at: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      },
      {
        id: 'TXN003',
        type: 'renewal',
        customer_name: 'Anna Garcia',
        amount: 8000,
        status: 'completed',
        created_at: new Date(Date.now() - 90 * 60 * 1000) // 1.5 hours ago
      },
      {
        id: 'TXN004',
        type: 'redemption',
        customer_name: 'Pedro Rodriguez',
        amount: 30000,
        status: 'completed',
        created_at: new Date(Date.now() - 120 * 60 * 1000) // 2 hours ago
      }
    ];

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
      indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
    };

    return colorMap[color] || colorMap['blue'];
  }

  getTransactionTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      new_loan: 'New Loan',
      payment: 'Payment',
      renewal: 'Renewal',
      redemption: 'Redemption'
    };

    return typeMap[type] || type;
  }

  getTransactionTypeColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      new_loan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      payment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      renewal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      redemption: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return colorMap[type] || colorMap['new_loan'];
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    return colorMap[status] || colorMap['pending'];
  }

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - targetDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} minute(s) ago`;
    } else if (diffMins < 1440) { // 24 hours
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour(s) ago`;
    } else {
      const diffDays = Math.floor(diffMins / 1440);
      return `${diffDays} day(s) ago`;
    }
  }

  loadPendingAppraisals() {
    this.appraisalService.getAppraisalsByStatus('completed').subscribe({
      next: (response) => {
        if (response.success) {
          this.pendingAppraisals = response.data.filter((appraisal: any) => 
            !appraisal.transaction_id
          );
        }
      },
      error: (error) => {
        console.error('Error loading pending appraisals:', error);
      }
    });
  }

  onTransactionTypeSelect(transactionType: any) {
    console.log('Selected transaction type:', transactionType);
    
    if (transactionType.id === 'create_appraisal') {
      this.enterAppraisalMode();
    } else {
      // Handle other transaction types - will implement transaction dialogs
      console.log('Other transaction type selected:', transactionType.id);
    }
  }

  enterAppraisalMode() {
    this.isAppraisalMode = true;
    this.loadAppraisalData();
  }

  exitAppraisalMode() {
    this.isAppraisalMode = false;
    this.resetAppraisalData();
  }

  private loadAppraisalData() {
    this.loadCategories();
    this.loadAddresses();
    this.loadRecentAppraisals();
  }

  private resetAppraisalData() {
    this.selectedPawner = null;
    this.searchQuery = '';
    this.pawners = [];
    this.appraisalItems = [];
    this.isCreatingAppraisal = false;
    this.showNewPawnerForm = false;
    this.resetPawnerForm();
    this.resetItemForm();
  }

  private resetPawnerForm() {
    this.pawnerForm = {
      first_name: '',
      last_name: '',
      address: '',
      city: '',
      barangay: '',
      phone: '',
      email: '',
      birth_date: '',
      id_type: '',
      id_number: '',
      civil_status: 'Single',
      gender: 'Male',
      occupation: ''
    };
  }

  private resetItemForm() {
    this.itemForm = {
      name: '',
      description: '',
      category: '',
      appraised_value: null,
      interest_rate: 3.5
    };
  }

  // Appraisal-related methods (simplified for cashier dashboard)
  loadCategories() {
    this.categoriesService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.toastService.showError('Error', 'Failed to load categories');
      }
    });
  }

  loadAddresses() {
    this.addressService.getCities().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.cities = response.data;
          this.filteredCities = [...this.cities];
        }
      },
      error: (error: any) => {
        console.error('Error loading cities:', error);
      }
    });

    this.addressService.getBarangays().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.barangays = response.data;
          this.filteredBarangays = [...this.barangays];
        }
      },
      error: (error: any) => {
        console.error('Error loading barangays:', error);
      }
    });
  }

  loadRecentAppraisals() {
    this.appraisalService.getAppraisals().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.recentAppraisals = response.data.slice(0, 10); // Get latest 10
        }
      },
      error: (error: any) => {
        console.error('Error loading recent appraisals:', error);
      }
    });
  }

  // Pawner search and management
  searchPawners() {
    if (this.searchQuery.trim().length < 2) {
      this.pawners = [];
      return;
    }

    this.pawnerService.searchPawners(this.searchQuery).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.pawners = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error searching pawners:', error);
        this.toastService.showError('Error', 'Failed to search pawners');
      }
    });
  }

  selectPawner(pawner: any) {
    this.selectedPawner = pawner;
    this.searchQuery = `${pawner.first_name} ${pawner.last_name}`;
    this.pawners = [];
  }

  showNewPawnerFormToggle() {
    this.showNewPawnerForm = !this.showNewPawnerForm;
    if (this.showNewPawnerForm) {
      this.selectedPawner = null;
      this.searchQuery = '';
      this.pawners = [];
    }
  }

  // Item management
  addItemToAppraisal() {
    if (!this.itemForm.name || !this.itemForm.category || !this.itemForm.appraised_value) {
      this.toastService.showError('Error', 'Please fill in all required item fields');
      return;
    }

    const categoryData = this.categories.find(cat => cat.name === this.itemForm.category);

    const item = {
      ...this.itemForm,
      category_description: categoryData?.description || '',
      id: Date.now()
    };

    this.appraisalItems.push(item);
    this.resetItemForm();
    this.toastService.showSuccess('Success', 'Item added to appraisal');
  }

  removeItemFromAppraisal(index: number) {
    this.appraisalItems.splice(index, 1);
    this.toastService.showSuccess('Success', 'Item removed from appraisal');
  }

  getTotalAppraisedValue(): number {
    return this.appraisalItems.reduce((total, item) => total + (item.appraised_value || 0), 0);
  }

  // Create appraisal (simplified for initial implementation)
  createAppraisal() {
    if (this.appraisalItems.length === 0) {
      this.toastService.showError('Error', 'Please add at least one item to the appraisal');
      return;
    }

    if (!this.selectedPawner) {
      this.toastService.showError('Error', 'Please select a pawner');
      return;
    }

    this.submitAppraisal(this.selectedPawner.id);
  }

  private submitAppraisal(pawnerId: number) {
    this.isCreatingAppraisal = true;

    // Create appraisal for each item (matching appraiser dashboard approach)
    let itemsSaved = 0;
    const totalItems = this.appraisalItems.length;

    this.appraisalItems.forEach((item, index) => {
      const appraisalRequest: CreateAppraisalRequest = {
        pawnerId: pawnerId,
        category: item.category,
        categoryDescription: item.category_description,
        description: item.name + (item.description ? ` - ${item.description}` : ''),
        estimatedValue: item.appraised_value,
        interestRate: item.interest_rate
      };

      this.appraisalService.createAppraisal(appraisalRequest).subscribe({
        next: (response: any) => {
          if (response.success) {
            itemsSaved++;
            
            if (itemsSaved === totalItems) {
              this.isCreatingAppraisal = false;
              this.toastService.showSuccess('Success', 'Appraisal created successfully!');
              this.resetAppraisalData();
              this.loadRecentAppraisals();
              this.loadPendingAppraisals();
            }
          } else {
            this.isCreatingAppraisal = false;
            this.toastService.showError('Error', 'Failed to create appraisal');
          }
        },
        error: (error: any) => {
          this.isCreatingAppraisal = false;
          console.error('Error creating appraisal:', error);
          this.toastService.showError('Error', 'Failed to create appraisal');
        }
      });
    });
  }

  // Address management (simplified for cashier dashboard)
  filterCities() {
    const query = this.pawnerForm.city.toLowerCase();
    this.filteredCities = this.cities.filter((city: any) => 
      city.name.toLowerCase().includes(query)
    );
  }

  filterBarangays() {
    const query = this.pawnerForm.barangay.toLowerCase();
    this.filteredBarangays = this.barangays.filter((barangay: any) => 
      barangay.name.toLowerCase().includes(query)
    );
  }

  selectCity(city: any) {
    this.pawnerForm.city = city.name;
    this.isCityDropdownOpen = false;
  }

  selectBarangay(barangay: any) {
    this.pawnerForm.barangay = barangay.name;
    this.isBarangayDropdownOpen = false;
  }
}
