import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
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
  imports: [CommonModule, FormsModule, RouterModule],
  animations: [
    trigger('errorAnimation', [
      state('show', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(-10px)'
        }),
        animate('300ms ease-out')
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({
          opacity: 0,
          transform: 'translateY(-10px)'
        }))
      ])
    ])
  ]
})
export class CashierDashboard implements OnInit {
  @ViewChild('newPawnerModal') newPawnerModal: any;
  @ViewChild('cityInput') cityInput: any;
  @ViewChild('barangayInput') barangayInput: any;
  @ViewChild('newLoanModal') newLoanModal: any;
  @ViewChild('principalInput') principalInput!: ElementRef;

  currentDateTime = new Date();
  isLoading = false;
  dashboardCards: DashboardCard[] = [];
  recentTransactions: Transaction[] = [];
  pendingAppraisals: Appraisal[] = [];

  // New Loan Modal Properties
  showNewLoanModal = false;
  selectedAppraisal: any = null;
  selectedPawnerInfo: any = null;
  loanData = {
    transactionDate: new Date(),
    grantedDate: new Date(),
    maturedDate: new Date(),
    expiredDate: new Date(),
    appraisalValue: 0,
    principalLoan: 0,
    principalAmount: '', // New property for the modal
    interestRate: 3.5, // Primary interest rate for display
    advanceInterest: 0,
    serviceCharge: 0,
    netProceed: 0,
    // New calculated properties for the modal
    calculatedPrincipal: 0,
    calculatedInterest: 0,
    calculatedServiceCharge: 0,
    calculatedNetProceed: 0,
    loanTermValue: 30,
    loanTermUnit: 'days',
    dueDate: new Date(),
    notes: '',
    collateralItems: [] as Array<{
      category: string;
      categoryDescription?: string;
      description: string;
      estimatedValue: number;
      weight?: number;
      karat?: number;
      serialNumber?: string;
    }>,
    // For multiple items with different categories
    itemsBreakdown: [] as Array<{
      name: string;
      category: string;
      appraisalValue: number;
      principalValue: number; // Portion of the principal allocated to this item
      interestRate: number;
      interestAmount: number;
    }>
  };
  displayPrincipalLoan = '0.00'; // For formatted display
  isEditingPrincipal = false; // Track if user is actively editing
  auditTrail: any[] = [];
  principalLoanError = '';

  // Find Pawner Modal Properties (similar to appraisal dashboard)
  showFindPawnerModal = false;
  searchResults: any[] = [];
  isSearching = false;
  isLoggedIn = false;
  showCreatePawnerForm = false;
  showStartNewLoanModal = false;
  isEditMode = false; // Track if we're editing an existing appraisal or creating new

  // New Loan Modal specific properties (missing from template)
  loanItems: any[] = []; // Items added to the loan
  showItemForm = true; // Show item form by default
  currentItem = {
    category: '',
    categoryDescription: '',
    description: '',
    estimatedValue: 0,
    weight: 0,
    karat: 0,
    serialNumber: '',
    notes: ''
  };
  isLoadingDescriptions = false;
  filteredCategoryDescriptions: any[] = [];

  // Pawner form for creating new pawners
  newPawner = {
    firstName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    cityId: undefined as number | undefined,
    barangayId: undefined as number | undefined,
    addressDetails: ''
  };

  // ViewChild references for auto-focus
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('firstNameInput') firstNameInput!: ElementRef;

  // Category interest rates configuration
  categoryInterestRates: { [key: string]: number } = {
    'jewelry': 3.5,
    'electronics': 4.0,
    'gold': 3.0,
    'silver': 3.2,
    'gadgets': 4.5,
    'appliances': 4.0,
    'default': 3.5
  };

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
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.loadPendingAppraisals();
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // Load categories to get interest rates from database
    this.loadCategories();
    
    // Load cities and barangays for pawner form
    this.loadCities();
    this.loadBarangays();
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

  formatCurrency(amount: number | undefined | null): string {
    const validAmount = amount ?? 0;
    if (isNaN(validAmount)) {
      console.warn('⚠️ formatCurrency received NaN, using 0:', amount);
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }).format(0);
    }
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(validAmount);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper method to safely get appraisal value
  getAppraisalValue(appraisal: any): number {
    // Try totalAppraisedValue first (from new API), then estimatedValue (from old API), then default to 0
    const value = appraisal.totalAppraisedValue ?? appraisal.estimatedValue ?? 0;

    // Check if we have multiple items with individual values
    if (appraisal.items?.length) {
      // Sum up the appraised values of all items
      return appraisal.items.reduce((sum: number, item: any) => {
        return sum + (item.appraised_value || 0);
      }, 0);
    }

    console.log(`🔍 Getting value for appraisal ${appraisal.id}:`, {
      totalAppraisedValue: appraisal.totalAppraisedValue,
      estimatedValue: appraisal.estimatedValue,
      finalValue: value
    });
    return value;
  }

  // Helper to prepare items breakdown with their respective interest rates
  prepareItemsBreakdown(appraisal: any) {
    this.loanData.itemsBreakdown = [];

    if (appraisal.items?.length) {
      // We have multiple items
      appraisal.items.forEach((item: any, index: number) => {
        const itemCategory = (item.category || appraisal.category || 'default').toLowerCase();
        const interestRate = this.categoryInterestRates[itemCategory] || this.categoryInterestRates['default'];

        this.loanData.itemsBreakdown.push({
          name: item.name || `Item #${index + 1}`,
          category: itemCategory,
          appraisalValue: item.appraised_value || 0,
          principalValue: 0, // Will be calculated later
          interestRate: interestRate,
          interestAmount: 0  // Will be calculated later
        });
      });
    } else {
      // Single item case
      const itemCategory = (appraisal.category || 'default').toLowerCase();
      const interestRate = this.categoryInterestRates[itemCategory] || this.categoryInterestRates['default'];

      this.loanData.itemsBreakdown.push({
        name: appraisal.itemName || appraisal.description || 'Item',
        category: itemCategory,
        appraisalValue: this.getAppraisalValue(appraisal),
        principalValue: 0, // Will be calculated later
        interestRate: interestRate,
        interestAmount: 0  // Will be calculated later
      });
    }

    console.log('Items breakdown prepared:', this.loanData.itemsBreakdown);
  }

  populateLoanItemsFromAppraisal(appraisal: any) {
    // Clear existing loan items
    this.loanItems = [];

    if (appraisal.items?.length) {
      // Multiple items case
      appraisal.items.forEach((item: any, index: number) => {
        this.loanItems.push({
          category: item.category || appraisal.category || 'default',
          categoryDescription: item.categoryDescription || item.description || `Item #${index + 1}`,
          description: item.description || item.name || `Item #${index + 1}`,
          estimatedValue: item.appraised_value || item.estimatedValue || 0,
          condition: item.condition || 'Good',
          remarks: item.remarks || ''
        });
      });
    } else {
      // Single item case
      this.loanItems.push({
        category: appraisal.category || 'default',
        categoryDescription: appraisal.itemType || appraisal.description || 'Item',
        description: appraisal.description || appraisal.itemName || 'Item',
        estimatedValue: this.getAppraisalValue(appraisal),
        condition: appraisal.condition || 'Good',
        remarks: appraisal.remarks || ''
      });
    }

    console.log('Loan items populated from appraisal:', this.loanItems);
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
    console.log('🔄 Loading pending appraisals...');
    this.appraisalService.getAppraisalsByStatus('completed').subscribe({
      next: (response: any) => {
        console.log('📊 API Response:', response);
        if (response.success) {
          // The API already filters for pending appraisals ready for transaction
          this.pendingAppraisals = response.data;
          console.log('✅ Loaded pending appraisals:', this.pendingAppraisals);

          // Debug each appraisal's totalAppraisedValue
          this.pendingAppraisals.forEach((appraisal: any, index: number) => {
            console.log(`Appraisal ${index + 1}:`, {
              id: appraisal.id,
              pawnerName: appraisal.pawnerName,
              totalAppraisedValue: appraisal.totalAppraisedValue,
              valueType: typeof appraisal.totalAppraisedValue,
              isNaN: isNaN(appraisal.totalAppraisedValue)
            });
          });
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading pending appraisals:', error);
      }
    });
  }

  onTransactionTypeSelect(transactionType: any) {
    console.log('Selected transaction type:', transactionType);

    if (transactionType.id === 'create_appraisal') {
      this.enterAppraisalMode();
    } else if (transactionType.id === 'new_loan') {
      // Show Find Pawner modal for New Loan
      this.startNewLoan();
    } else {
      // Navigate to transaction page with transaction type
      this.navigateToTransactionPage(transactionType.id);
    }
  }

  navigateToTransaction(appraisal: any) {
    console.log('Opening New Loan modal with appraisal:', appraisal);

    // If we need to fetch additional data for the pawner, we might do that here
    // For now, let's check if we need to retrieve more details
    if (appraisal.pawnerId && !appraisal.pawnerContactNumber && !appraisal.phone && !appraisal.contactNumber) {
      console.log('🔄 Fetching more pawner details for ID:', appraisal.pawnerId);
      // Here you might want to add a service call to get more pawner details if needed
      // For example:
      // this.pawnerService.getPawnerDetails(appraisal.pawnerId).subscribe(...)
    }

    this.selectedAppraisal = appraisal;
    this.initializeLoanData(appraisal);

    // Make sure to load pawner info before showing the modal
    this.loadPawnerInfo(appraisal);
    
    // Populate loan items from the appraisal data
    this.populateLoanItemsFromAppraisal(appraisal);
    
    // Ensure the pawner form is visible in the modal
    this.showCreatePawnerForm = true;
    this.isEditMode = false;
    this.showItemForm = true;
    
    // Show the modal
    this.showNewLoanModal = true;

    // Focus on principal input field after the modal is displayed
    setTimeout(() => {
      if (this.principalInput && this.principalInput.nativeElement) {
        this.principalInput.nativeElement.focus();
        // Don't select all text since we start with 0.00
        this.addAuditEntry('Principal input focused', { action: 'focus' });
      }
    }, 200); // Increased timeout for more reliable focus
  }

  navigateToTransactionPage(transactionType: string) {
    console.log('Navigating to transaction page with type:', transactionType);

    // Show toast for now since transaction page doesn't exist yet
    const transactionLabels: { [key: string]: string } = {
      'new_loan': 'New Loan',
      'additional': 'Additional Loan',
      'partial': 'Partial Payment',
      'redeem': 'Loan Redemption',
      'renew': 'Loan Renewal'
    };

    const label = transactionLabels[transactionType] || 'Transaction';
    this.toastService.showInfo('Navigation', `${label} page - Coming Soon`);

    // TODO: Implement actual navigation when transaction pages are ready
    // this.router.navigate(['/transaction'], {
    //   queryParams: { type: transactionType }
    // });
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

  // Appraisal-related methods (simplified for cashier dashboard)
  loadCategories() {
    this.categoriesService.getCategories().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.categories = response.data;

          // Update interest rates from database values
          this.updateInterestRatesFromDatabase(response.data);
          console.log('📊 Categories loaded with interest rates:', this.categoryInterestRates);
        }
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
        this.toastService.showError('Error', 'Failed to load categories');
      }
    });
  }

  // Update interest rates from database categories
  private updateInterestRatesFromDatabase(categories: Category[]) {
    if (!categories || !categories.length) return;

    // Reset the interest rates object
    this.categoryInterestRates = { default: 3.5 }; // Keep a default as fallback

    // Populate with database values
    categories.forEach(category => {
      if (category.name && category.interest_rate) {
        // Convert from string to number and store by lowercase category name
        const rateName = category.name.toLowerCase();
        const rateValue = parseFloat(category.interest_rate);

        if (!isNaN(rateValue)) {
          this.categoryInterestRates[rateName] = rateValue;
        }
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

  // Authentication check method
  checkAuthStatus() {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
  }

  // Pawner search and management
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

  // Select Pawner (adapted from appraisal dashboard for loan workflow)
  selectPawner(pawner: any) {
    this.selectedPawner = pawner;
    this.searchResults = [];
    this.searchQuery = `${pawner.firstName || pawner.first_name} ${pawner.lastName || pawner.last_name} - ${pawner.contactNumber || pawner.contact_number}`;
    
    // Populate the form fields with selected pawner data
    this.newPawner = {
      firstName: pawner.firstName || pawner.first_name || '',
      lastName: pawner.lastName || pawner.last_name || '',
      contactNumber: pawner.contactNumber || pawner.contact_number || pawner.phone || '',
      email: pawner.email || '',
      cityId: pawner.cityId || pawner.city_id || undefined,
      barangayId: pawner.barangayId || pawner.barangay_id || undefined,
      addressDetails: pawner.addressDetails || pawner.address_details || pawner.address || ''
    };

    console.log('Selected pawner for loan:', pawner);
    this.toastService.showSuccess('Pawner Selected', `Selected ${pawner.firstName || pawner.first_name} ${pawner.lastName || pawner.last_name} for loan processing`);
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

  // New Loan Modal Methods
  initializeLoanData(appraisal: any) {
    const now = new Date();
    const appraisedValue = this.getAppraisalValue(appraisal);

    // Initialize dates
    this.loanData.transactionDate = now;
    this.loanData.grantedDate = now;

    // Matured date: 1 month from transaction date
    const maturedDate = new Date(now);
    maturedDate.setMonth(maturedDate.getMonth() + 1);
    this.loanData.maturedDate = maturedDate;

    // Expired date: 4 months from transaction date
    const expiredDate = new Date(now);
    expiredDate.setMonth(expiredDate.getMonth() + 4);
    this.loanData.expiredDate = expiredDate;

    // Prepare items breakdown with their respective categories and interest rates
    this.prepareItemsBreakdown(appraisal);

    // Calculate and set the display interest rate (weighted average or primary)
    if (this.loanData.itemsBreakdown.length === 1) {
      // Single category - use its interest rate
      this.loanData.interestRate = this.loanData.itemsBreakdown[0].interestRate;
      console.log(`Using interest rate: ${this.loanData.interestRate}% for category: ${this.loanData.itemsBreakdown[0].category}`);
    } else if (this.loanData.itemsBreakdown.length > 1) {
      // Multiple categories - calculate weighted average
      this.loanData.interestRate = this.calculateWeightedAverageRate();

      // Check if we have multiple unique categories
      const uniqueCategories = new Set(this.loanData.itemsBreakdown.map(item => item.category));
      if (uniqueCategories.size > 1) {
        console.log(`Multiple categories detected (${uniqueCategories.size}). Using weighted average rate: ${this.loanData.interestRate}%`);
      } else {
        console.log(`All items have same category: ${this.loanData.itemsBreakdown[0].category}. Using rate: ${this.loanData.interestRate}%`);
      }
    } else {
      // Fallback to default rate if no items breakdown
      const defaultCategory = appraisal.category?.toLowerCase() || 'default';
      this.loanData.interestRate = this.categoryInterestRates[defaultCategory] || this.categoryInterestRates['default'];
      console.log(`No items breakdown. Using default rate: ${this.loanData.interestRate}%`);
    }

    // Initialize financial values
    this.loanData.appraisalValue = appraisedValue;
    this.loanData.principalLoan = 0; // Default to 0 instead of percentage of appraised value
    this.loanData.advanceInterest = 0;
    this.loanData.serviceCharge = 0;
    this.loanData.netProceed = 0; // Explicitly set to 0
    this.displayPrincipalLoan = '0.00';
    this.principalLoanError = '';

    // Load pawner information
    this.loadPawnerInfo(appraisal);

    this.calculateLoanAmount();
    this.addAuditEntry('Loan data initialized', {
      appraisalId: appraisal.id,
      pawnerName: appraisal.pawnerName,
      appraisalValue: appraisedValue,
      principalLoan: this.loanData.principalLoan,
      interestRate: this.loanData.interestRate,
      category: this.loanData.itemsBreakdown?.[0]?.category || appraisal.category || 'default'
    });
  }

  calculateLoanAmount() {
    const principal = this.loanData.principalLoan;

    if (this.loanData.itemsBreakdown.length > 0) {
      // Reset the interest amount
      this.loanData.advanceInterest = 0;

      // Allocate principal to each item proportionally based on appraisal value
      const totalAppraisalValue = this.loanData.appraisalValue;

      if (totalAppraisalValue > 0) {
        // Calculate each item's share of the principal and its interest
        this.loanData.itemsBreakdown.forEach(item => {
          const proportion = item.appraisalValue / totalAppraisalValue;
          item.principalValue = principal * proportion;
          item.interestAmount = Math.floor(item.principalValue * (item.interestRate / 100));

          // Add to the total interest
          this.loanData.advanceInterest += item.interestAmount;
        });

        console.log('Item-level breakdown after calculation:', this.loanData.itemsBreakdown);
      } else {
        // Fallback if total appraisal value is 0
        const rate = this.loanData.interestRate / 100;
        this.loanData.advanceInterest = Math.floor(principal * rate);
      }
    } else {
      // Fallback for no items breakdown
      const rate = this.loanData.interestRate / 100;
      this.loanData.advanceInterest = Math.floor(principal * rate);
    }

    // Calculate service charge based on principal loan amount
    // 1-199: 1 PHP, 200-299: 2 PHP, 300-399: 3 PHP, 400-499: 4 PHP, 500+: 5 PHP
    let serviceCharge = 0;

    // Only apply service charge if principal loan amount is greater than 0
    if (principal > 0) {
      if (principal <= 199) {
        serviceCharge = 1;
      } else if (principal <= 299) {
        serviceCharge = 2;
      } else if (principal <= 399) {
        serviceCharge = 3;
      } else if (principal <= 499) {
        serviceCharge = 4;
      } else {
        serviceCharge = 5;
      }
    }

    this.loanData.serviceCharge = serviceCharge;

    // Calculate net proceed: Principal Loan - Advance Service Charge - Advance Interest
    // Ensure it's never negative
    if (principal === 0) {
      this.loanData.netProceed = 0; // When principal is 0, net proceed should be 0
    } else {
      this.loanData.netProceed = Math.max(0, principal - this.loanData.serviceCharge - this.loanData.advanceInterest);
    }

    this.addAuditEntry('Loan amount calculated', {
      principalLoan: this.loanData.principalLoan,
      totalInterest: this.loanData.advanceInterest,
      serviceCharge: this.loanData.serviceCharge,
      netProceed: this.loanData.netProceed,
      itemsBreakdown: this.loanData.itemsBreakdown
    });
  }

  onPrincipalLoanChange() {
    console.log('Principal loan changed:', this.loanData.principalLoan);

    // Validate principal loan does not exceed appraisal value
    if (this.loanData.principalLoan > this.loanData.appraisalValue) {
      const formattedMax = this.formatCurrency(this.loanData.appraisalValue);
      this.principalLoanError = `Amount exceeds maximum allowable value of ${formattedMax}`;
      this.toastService.showError('Validation Error', `Principal loan cannot exceed appraisal value of ${formattedMax}`);
      this.loanData.principalLoan = this.loanData.appraisalValue;
      // Update the display value to match the capped amount
      if (!this.isEditingPrincipal) {
        this.updateDisplayPrincipal();
      }
      this.addAuditEntry('Principal loan validation failed', {
        attemptedAmount: this.loanData.principalLoan,
        maxAllowed: this.loanData.appraisalValue
      });
    } else {
      this.principalLoanError = '';
    }

    // Calculate loan amounts with item breakdown
    this.calculateLoanAmount();

    // Log the calculation results for debugging
    if (this.loanData.itemsBreakdown.length > 1) {
      console.log('Multiple items with different rates:', {
        totalPrincipal: this.loanData.principalLoan,
        totalInterest: this.loanData.advanceInterest,
        breakdown: this.loanData.itemsBreakdown.map(item => ({
          name: item.name,
          category: item.category,
          rate: item.interestRate,
          principalShare: item.principalValue,
          interestAmount: item.interestAmount
        }))
      });
    }
  }



  // Get a description of how the interest rate was determined
  getInterestRateDescription(): string {
    if (!this.selectedAppraisal) return 'Standard rate';

    // Check if we have multiple items with different categories
    if (this.loanData.itemsBreakdown && this.loanData.itemsBreakdown.length > 1) {
      const uniqueCategories = new Set(this.loanData.itemsBreakdown.map(item => item.category));
      if (uniqueCategories.size > 1) {
        return `Multiple categories (${uniqueCategories.size})`;
      }
    }

    const category = this.selectedAppraisal.category?.toLowerCase() || 'default';
    return `${category.charAt(0).toUpperCase() + category.slice(1)} rate`;
  }

  // Calculate weighted average interest rate based on item values
  calculateWeightedAverageRate(): number {
    if (!this.loanData.itemsBreakdown || this.loanData.itemsBreakdown.length === 0) {
      return this.categoryInterestRates['default'] || 3.5;
    }

    // If only one item, return its rate
    if (this.loanData.itemsBreakdown.length === 1) {
      return this.loanData.itemsBreakdown[0].interestRate;
    }

    // Calculate weighted average
    const totalValue = this.loanData.itemsBreakdown.reduce((sum, item) => sum + item.appraisalValue, 0);

    if (totalValue <= 0) return this.categoryInterestRates['default'] || 3.5;

    const weightedSum = this.loanData.itemsBreakdown.reduce((sum, item) => {
      return sum + (item.interestRate * item.appraisalValue / totalValue);
    }, 0);

    return Math.round(weightedSum * 10) / 10; // Round to 1 decimal place
  }

  loadPawnerInfo(appraisal: any) {
    // First log the entire appraisal object to see what we're working with
    console.log('🔍 DEBUG: Full appraisal object:', JSON.stringify(appraisal, null, 2));
    console.log('📱 DEBUG: Contact number fields:',
      {
        'contactNumber': appraisal.contactNumber,
        'contact_number': appraisal.contact_number,
        'phone': appraisal.phone,
        'mobileNumber': appraisal.mobileNumber,
        'mobile_number': appraisal.mobile_number,
        'phoneNumber': appraisal.phoneNumber,
        'phone_number': appraisal.phone_number,
        'contact': appraisal.contact,
        'pawner?.contactNumber': appraisal.pawner?.contactNumber,
        'pawner?.contact_number': appraisal.pawner?.contact_number,
        'pawner?.phone': appraisal.pawner?.phone,
        'pawner?.contact': appraisal.pawner?.contact,
        'pawner?.mobileNo': appraisal.pawner?.mobileNo,
        'contact_details?.number': appraisal.contact_details?.number
      }
    );

    // Helper function to get contact number from multiple possible field names
    const getContactNumber = () => {
      // Check all possible field names for the contact number - expanded to handle more field formats
      const contactValue =
        appraisal.contactNumber ||
        appraisal.contact_number ||
        appraisal.phone ||
        appraisal.mobileNumber ||
        appraisal.mobile_number ||
        appraisal.phoneNumber ||
        appraisal.phone_number ||
        appraisal.contact ||
        (appraisal.pawner?.contactNumber) ||
        (appraisal.pawner?.contact_number) ||
        (appraisal.pawner?.phone) ||
        (appraisal.pawner?.contact) ||
        (appraisal.pawner?.mobileNo) ||
        (appraisal.contact_details?.number) ||
        (appraisal.contact_info?.number);

      console.log('📞 DEBUG: Final contact value:', contactValue);
      return contactValue || 'Not provided';
    };

    // In a real application, this would fetch pawner details from the API
    // For now, we'll use mock data or extract from appraisal
    this.selectedPawnerInfo = {
      fullName: appraisal.pawnerName || (appraisal.pawner?.name) || 'Unknown Pawner',
      contactNumber: getContactNumber(),
      // These would come from a proper pawner lookup
      address: appraisal.address || (appraisal.pawner?.address) || 'Address not available',
      idType: appraisal.idType || (appraisal.pawner?.idType) || 'Not specified',
      idNumber: appraisal.idNumber || (appraisal.pawner?.idNumber) || 'Not specified'
    };

    // Also populate the pawner form with available data for display in the modal
    const fullName = this.selectedPawnerInfo.fullName || '';
    const nameParts = fullName.split(' ');
    
    this.pawnerForm = {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      address: appraisal.address || (appraisal.pawner?.address) || '',
      city: appraisal.city || (appraisal.pawner?.city) || '',
      barangay: appraisal.barangay || (appraisal.pawner?.barangay) || '',
      phone: getContactNumber(),
      email: appraisal.email || (appraisal.pawner?.email) || '',
      birth_date: appraisal.birthDate || appraisal.birth_date || (appraisal.pawner?.birthDate) || '',
      id_type: appraisal.idType || (appraisal.pawner?.idType) || '',
      id_number: appraisal.idNumber || (appraisal.pawner?.idNumber) || '',
      civil_status: appraisal.civilStatus || appraisal.civil_status || (appraisal.pawner?.civilStatus) || 'Single',
      gender: appraisal.gender || (appraisal.pawner?.gender) || 'Male',
      occupation: appraisal.occupation || (appraisal.pawner?.occupation) || ''
    };

    console.log('📋 DEBUG: Final selectedPawnerInfo:', this.selectedPawnerInfo);
    console.log('📝 DEBUG: Populated pawnerForm:', this.pawnerForm);

    this.addAuditEntry('Pawner information loaded', {
      pawnerId: appraisal.pawnerId,
      pawnerName: this.selectedPawnerInfo.fullName
    });
  }

  closeNewLoanModal() {
    this.addAuditEntry('Modal closed', { action: 'cancel' });
    this.showNewLoanModal = false;
    this.selectedAppraisal = null;
    this.selectedPawnerInfo = null;
    this.principalLoanError = '';
    // Keep audit trail for logging purposes, don't clear it
  }

  resetPrincipalLoan() {
    this.loanData.principalLoan = 0;
    this.displayPrincipalLoan = '0.00';
    this.onPrincipalLoanChange();
    setTimeout(() => {
      if (this.principalInput && this.principalInput.nativeElement) {
        this.principalInput.nativeElement.focus();
      }
    }, 100);
    this.toastService.showInfo('Reset', 'Principal loan amount has been reset to 0');
    this.addAuditEntry('Principal loan reset', { action: 'reset' });
  }

  // New methods for handling the formatted principal loan display
  onDisplayPrincipalChange(value: string) {
    this.isEditingPrincipal = true;
    // Remove currency formatting while typing
    const numericValue = this.parseFormattedNumber(value);
    this.loanData.principalLoan = numericValue;
    this.onPrincipalLoanChange();
  }

  onPrincipalInputFocus() {
    this.isEditingPrincipal = true;
    // When focusing, show unformatted number for easier editing
    if (this.loanData.principalLoan === 0) {
      this.displayPrincipalLoan = '';
    } else {
      this.displayPrincipalLoan = this.loanData.principalLoan.toString();
    }
  }

  onPrincipalInputBlur() {
    this.isEditingPrincipal = false;
    this.updateDisplayPrincipal();
  }

  updateDisplayPrincipal() {
    // Format the principal amount with commas and two decimal places
    this.displayPrincipalLoan = this.formatNumberWithCommas(this.loanData.principalLoan);
  }

  // Helper method to parse formatted numbers (remove commas, currency symbols)
  parseFormattedNumber(value: string): number {
    // Remove all non-numeric characters except decimal point
    const numericString = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Helper method to format numbers with commas and two decimal places
  formatNumberWithCommas(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  createLoan() {
    if (!this.selectedAppraisal) {
      this.toastService.showError('Error', 'No appraisal selected');
      return;
    }

    console.log('Creating loan with data:', {
      appraisal: this.selectedAppraisal,
      loanData: this.loanData,
      auditTrail: this.auditTrail
    });

    this.addAuditEntry('Loan creation initiated', {
      appraisalId: this.selectedAppraisal.id,
      pawnerName: this.selectedAppraisal.pawnerName,
      finalLoanData: { ...this.loanData }
    });

    // TODO: Implement actual loan creation API call
    this.toastService.showSuccess(
      'Loan Created',
      `New loan created for ${this.selectedAppraisal.pawnerName} - ₱${this.formatCurrency(this.loanData.netProceed)} net proceed`
    );

    this.closeNewLoanModal();
  }

  addAuditEntry(action: string, details: any) {
    const entry = {
      timestamp: new Date(),
      action,
      details,
      user: 'Current User' // TODO: Get from auth service
    };
    this.auditTrail.push(entry);
    console.log('Audit entry added:', entry);
  }

  // ==================== NEW LOAN - FIND PAWNER FUNCTIONALITY ====================
  
  startNewLoan() {
    console.log('startNewLoan() called - setting showFindPawnerModal to true');
    this.showFindPawnerModal = true;
    this.resetPawnerSelection();
    
    console.log('showFindPawnerModal is now:', this.showFindPawnerModal);
    
    // Auto-focus on search input
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
        console.log('Focus set on search input');
      } else {
        console.log('searchInput not found');
      }
    }, 100);
  }

  resetPawnerSelection() {
    this.selectedPawner = null;
    this.searchQuery = '';
    this.searchResults = [];
    this.newPawner = {
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      cityId: undefined,
      barangayId: undefined,
      addressDetails: ''
    };
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

  // Clear Selection (updated to match appraisal dashboard)
  clearSelection() {
    this.selectedPawner = null;
    this.searchQuery = '';
    this.searchResults = [];
    this.showCreatePawnerForm = false;
  }

  cancelFindPawner() {
    // Hide the find pawner modal
    this.showFindPawnerModal = false;
    
    // Clear all search data
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedPawner = null;
    
    // Reset the new pawner form
    this.resetPawnerSelection();
    
    console.log('Find Pawner cancelled');
  }

  selectPawnerForLoan(pawner: any) {
    this.selectedPawner = pawner;
    console.log('Selected pawner for loan:', pawner);
    
    // Show the pawner form in the loan modal
    this.showCreatePawnerForm = true;
    
    // Populate the form with selected pawner data
    this.newPawner = {
      firstName: pawner.firstName || pawner.first_name || '',
      lastName: pawner.lastName || pawner.last_name || '',
      contactNumber: pawner.contactNumber || pawner.contact_number || pawner.phone || '',
      email: pawner.email || '',
      cityId: pawner.cityId || pawner.city_id || null,
      barangayId: pawner.barangayId || pawner.barangay_id || null,
      addressDetails: pawner.addressDetails || pawner.address_details || pawner.address || ''
    };
    
    // Clear search results after selection
    this.searchResults = [];
    
    // Set the selected pawner info for the loan
    this.selectedPawnerInfo = {
      fullName: `${this.newPawner.firstName} ${this.newPawner.lastName}`,
      contactNumber: this.newPawner.contactNumber,
      email: this.newPawner.email,
      address: this.newPawner.addressDetails
    };

    // Initialize loan data with default values
    this.initializeLoanDataForNewLoan();
    
    // Show the loan modal
    this.showNewLoanModal = true;
    this.showFindPawnerModal = false;
    
    // Auto-focus on the principal input
    setTimeout(() => {
      if (this.principalInput) {
        this.principalInput.nativeElement.focus();
      }
    }, 100);
    
    this.toastService.showSuccess('Success', 'Pawner selected successfully!');
  }

  changePawner() {
    // Reset selection and go back to find pawner
    this.selectedPawner = null;
    this.selectedPawnerInfo = null;
    this.showNewLoanModal = false;
    this.showFindPawnerModal = true;
    
    // Focus on search input
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  onPrincipalAmountChange() {
    // Parse and format the principal amount
    const amount = parseFloat(this.loanData.principalAmount?.toString().replace(/[^\d.]/g, '') || '0');
    this.loanData.calculatedPrincipal = amount;
    this.calculateLoanValues();
  }

  onInterestRateChange() {
    this.calculateLoanValues();
  }

  // Missing methods for pawner management
  createPawner() {
    console.log('Creating pawner:', this.newPawner);
    // Implementation would create a new pawner record
    this.toastService.showSuccess('Success', 'Pawner created successfully!');
  }

  formatContactNumber(event: any) {
    // Simple formatting for contact numbers
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    event.target.value = value;
    this.newPawner.contactNumber = value;
  }

  showAddCityDialog() {
    console.log('Show add city dialog');
    // Implementation would show city dialog
  }

  showAddBarangayDialog() {
    console.log('Show add barangay dialog');
    // Implementation would show barangay dialog
  }

  // Missing methods for item management
  calculateTotalValue(): number {
    return this.loanItems.reduce((total, item) => total + (item.estimatedValue || 0), 0);
  }

  removeItemFromLoan(index: number) {
    this.loanItems.splice(index, 1);
    this.toastService.showInfo('Item Removed', 'Item removed from loan');
  }

  saveItemLoan() {
    // Validate item form
    if (!this.currentItem.category || !this.currentItem.estimatedValue) {
      this.toastService.showError('Validation Error', 'Please fill in required fields');
      return;
    }
    
    // Add to loan items array
    this.addItemToLoan();
  }

  addItemToLoan() {
    if (!this.currentItem.category || !this.currentItem.estimatedValue) {
      this.toastService.showError('Validation Error', 'Please fill in category and estimated value');
      return;
    }

    const newItem = { ...this.currentItem };
    this.loanItems.push(newItem);
    
    // Reset form
    this.resetItemForm();
    
    this.toastService.showSuccess('Success', 'Item added to loan');
  }

  onCategoryChange() {
    // Load category descriptions when category changes
    console.log('Category changed:', this.currentItem.category);
    this.loadCategoryDescriptions();
  }

  loadCategoryDescriptions() {
    // Mock implementation
    this.isLoadingDescriptions = true;
    setTimeout(() => {
      this.filteredCategoryDescriptions = [
        { description: '18K Gold Ring' },
        { description: '21K Gold Necklace' },
        { description: '24K Gold Bracelet' }
      ];
      this.isLoadingDescriptions = false;
    }, 500);
  }

  openAddCategoryDescriptionDialog() {
    console.log('Open add category description dialog');
  }

  onEstimatedValueInput(event: any) {
    // Format currency input
    let value = event.target.value.replace(/[^\d.]/g, '');
    this.currentItem.estimatedValue = parseFloat(value) || 0;
  }

  onEstimatedValueFocus(event: any) {
    // Clear formatting on focus
    event.target.select();
  }

  onEstimatedValueBlur(event: any) {
    // Format on blur
    const value = parseFloat(event.target.value) || 0;
    event.target.value = value.toFixed(2);
    this.currentItem.estimatedValue = value;
  }

  resetItemForm() {
    this.currentItem = {
      category: '',
      categoryDescription: '',
      description: '',
      estimatedValue: 0,
      weight: 0,
      karat: 0,
      serialNumber: '',
      notes: ''
    };
  }

  saveLoan() {
    if (!this.canSaveLoan()) {
      this.toastService.showError('Validation Error', 'Please complete all required fields');
      return;
    }

    console.log('Saving loan with items:', this.loanItems);
    this.toastService.showSuccess('Success', 'Loan saved successfully!');
    this.closeNewLoanModal();
  }

  canSaveLoan(): boolean {
    return (this.selectedPawner || this.showCreatePawnerForm) && 
           this.loanItems.length > 0 &&
           this.newPawner.firstName && 
           this.newPawner.lastName && 
           this.newPawner.contactNumber;
  }

  resetLoanForm() {
    this.loanItems = [];
    this.resetItemForm();
    this.selectedPawner = null;
    this.showCreatePawnerForm = false;
    this.newPawner = {
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      cityId: undefined,
      barangayId: undefined,
      addressDetails: ''
    };
  }

  // Email validation helper (removed duplicate - keeping the one that handles optional emails)

  onLoanTermChange() {
    this.calculateLoanValues();
    this.calculateDueDate();
  }

  calculateLoanValues() {
    const principal = this.loanData.calculatedPrincipal || 0;
    const rate = this.loanData.interestRate || 3.5;
    
    // Calculate interest
    this.loanData.calculatedInterest = (principal * rate) / 100;
    
    // Calculate service charge (example: 2% of principal)
    this.loanData.calculatedServiceCharge = principal * 0.02;
    
    // Calculate net proceed
    this.loanData.calculatedNetProceed = principal - this.loanData.calculatedServiceCharge;
  }

  calculateDueDate() {
    const today = new Date();
    const termValue = this.loanData.loanTermValue || 30;
    const termUnit = this.loanData.loanTermUnit || 'days';
    
    let dueDate = new Date(today);
    
    if (termUnit === 'days') {
      dueDate.setDate(today.getDate() + termValue);
    } else if (termUnit === 'months') {
      dueDate.setMonth(today.getMonth() + termValue);
    }
    
    this.loanData.dueDate = dueDate;
  }

  addCollateralItem() {
    // This would typically open an item entry form/modal
    // For now, we'll add a placeholder item
    if (!this.loanData.collateralItems) {
      this.loanData.collateralItems = [];
    }
    
    // You would implement a proper item entry modal here
    this.toastService.showInfo('Info', 'Item entry functionality would be implemented here');
  }

  removeCollateralItem(index: number) {
    if (this.loanData.collateralItems) {
      this.loanData.collateralItems.splice(index, 1);
    }
  }

  getTotalCollateralValue(): number {
    if (!this.loanData.collateralItems) return 0;
    return this.loanData.collateralItems.reduce((total, item) => total + (item.estimatedValue || 0), 0);
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Jewelry': '💎',
      'Electronics': '📱',
      'Appliances': '🔌',
      'Vehicles': '🚗',
      'Tools': '🔧',
      'Watches': '⌚',
      'Gadgets': '💻',
      'Other': '📦'
    };
    return icons[category] || '📦';
  }

  isLoanFormValid(): boolean {
    return !!(
      this.loanData.calculatedPrincipal && 
      this.loanData.calculatedPrincipal > 0 &&
      this.loanData.interestRate &&
      this.loanData.loanTermValue &&
      this.loanData.loanTermUnit
    );
  }

  saveLoanApplication() {
    if (!this.isLoanFormValid()) {
      this.toastService.showWarning('Invalid Form', 'Please complete all required fields');
      return;
    }

    // Here you would save the loan application
    console.log('Saving loan application:', {
      pawner: this.selectedPawnerInfo,
      loanData: this.loanData
    });

    this.toastService.showSuccess('Success', 'Loan application created successfully!');
    this.closeNewLoanModal();
  }

  closeFindPawnerModal() {
    this.showFindPawnerModal = false;
    this.resetPawnerSelection();
  }

  startNewLoanWithPawner() {
    // Always show the pawner form in the loan modal
    this.showCreatePawnerForm = true;
    
    // If there's a selected pawner, use their info
    if (this.selectedPawner) {
      // Set the selected pawner info for the loan
      this.selectedPawnerInfo = {
        fullName: `${this.selectedPawner.firstName || this.selectedPawner.first_name} ${this.selectedPawner.lastName || this.selectedPawner.last_name}`,
        contactNumber: this.selectedPawner.contactNumber || this.selectedPawner.contact_number || this.selectedPawner.phone,
        email: this.selectedPawner.email || '',
        address: this.selectedPawner.addressDetails || this.selectedPawner.address_details || this.selectedPawner.address || ''
      };
      
      // Populate form with selected pawner data
      this.newPawner = {
        firstName: this.selectedPawner.firstName || this.selectedPawner.first_name || '',
        lastName: this.selectedPawner.lastName || this.selectedPawner.last_name || '',
        contactNumber: this.selectedPawner.contactNumber || this.selectedPawner.contact_number || this.selectedPawner.phone || '',
        email: this.selectedPawner.email || '',
        cityId: this.selectedPawner.cityId || this.selectedPawner.city_id,
        barangayId: this.selectedPawner.barangayId || this.selectedPawner.barangay_id,
        addressDetails: this.selectedPawner.addressDetails || this.selectedPawner.address_details || this.selectedPawner.address || ''
      };
    } else {
      // No pawner selected, create new loan with empty pawner info
      this.selectedPawnerInfo = {
        fullName: 'New Customer',
        contactNumber: '',
        email: '',
        address: ''
      };
      
      // Reset form for new pawner
      this.newPawner = {
        firstName: '',
        lastName: '',
        contactNumber: '',
        email: '',
        cityId: undefined,
        barangayId: undefined,
        addressDetails: ''
      };
    }

    // Initialize loan data with default values
    this.initializeLoanDataForNewLoan();
    
    // Close find pawner modal and open loan modal
    this.showFindPawnerModal = false;
    this.showNewLoanModal = true;
    
    // Auto-focus on the principal input
    setTimeout(() => {
      if (this.principalInput) {
        this.principalInput.nativeElement.focus();
      }
    }, 100);
  }

  isPawnerFormValid(): boolean {
    return !!(
      this.newPawner.firstName &&
      this.newPawner.lastName &&
      this.newPawner.contactNumber
    );
  }

  initializeLoanDataForNewLoan() {
    // Initialize with default loan data
    const today = new Date();
    const dueDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days default
    
    this.loanData = {
      transactionDate: today,
      grantedDate: today,
      maturedDate: new Date(today.getTime() + (4 * 30 * 24 * 60 * 60 * 1000)), // 4 months
      expiredDate: new Date(today.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)), // 6 months
      appraisalValue: 0,
      principalLoan: 0,
      principalAmount: '',
      interestRate: 3.5,
      advanceInterest: 0,
      serviceCharge: 0,
      netProceed: 0,
      calculatedPrincipal: 0,
      calculatedInterest: 0,
      calculatedServiceCharge: 0,
      calculatedNetProceed: 0,
      loanTermValue: 30,
      loanTermUnit: 'days',
      dueDate: dueDate,
      notes: '',
      collateralItems: [],
      itemsBreakdown: []
    };
    
    this.displayPrincipalLoan = '0.00';
    this.principalLoanError = '';
  }

  // City and Barangay functionality
  onCityChange() {
    if (this.newPawner.cityId) {
      this.filteredBarangays = this.barangays.filter(b => b.cityId === this.newPawner.cityId);
      this.newPawner.barangayId = undefined; // Reset barangay selection
    } else {
      this.filteredBarangays = [];
    }
  }

  loadCities() {
    this.addressService.getCities().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.cities = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading cities:', error);
      }
    });
  }

  loadBarangays() {
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

  isValidEmail(email: string): boolean {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
