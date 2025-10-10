import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Pawner {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  cityId?: number;
  barangayId?: number;
}

interface QueueEntry {
  id: number;
  queueNumber: string;
  status: string;
  isNewPawner: boolean;
  serviceType: string;
  joinedAt: string;
  pawner?: Pawner;
}

@Component({
  selector: 'app-pawner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pawner-dashboard.html',
  styleUrl: './pawner-dashboard.css'
})
export class PawnerDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly API_URL = 'http://localhost:3000/api';

  // Flow state
  currentStep: 'select_transaction' | 'customer_type' | 'search' | 'register' = 'select_transaction';
  selectedServiceType: string | null = null;
  customerType: 'new' | 'existing' | null = null;
  searchType: 'ticket' | 'mobile' = 'ticket';

  // Search state
  searchTerm = '';
  searchResults: Pawner[] = [];
  selectedPawner: Pawner | null = null;
  isSearching = false;
  searchPerformed = false;

  // Queue state
  queueEntry: QueueEntry | null = null;
  isJoiningQueue = false;
  queueCompleted = false; // Track if queue entry was just completed
  errorMessage = '';

  // Queue list for all waiting pawners
  queueList: QueueEntry[] = [];
  loadingQueueList = false;

  // New pawner registration state
  isRegistering = false;
  newPawnerForm = {
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    address: '',
    cityId: null as number | null,
    barangayId: null as number | null
  };

  // City and Barangay data
  cities: any[] = [];
  barangays: any[] = [];
  loadingCities = false;
  loadingBarangays = false;

  serviceTypes = [
    { value: 'new_loan', label: 'New Loan', icon: '💰' },
    { value: 'renew', label: 'Renew Loan', icon: '🔄' },
    { value: 'redeem', label: 'Redeem Item', icon: '🎁' },
    { value: 'additional_loan', label: 'Additional Loan', icon: '➕' },
    { value: 'partial_payment', label: 'Partial Payment', icon: '💵' },
    { value: 'inquiry', label: 'Inquiry', icon: '❓' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Pawner Dashboard initialized with queue system');
    this.checkExistingQueue();
    this.loadQueueList();

    // Auto-refresh queue list every 10 seconds
    setInterval(() => {
      this.loadQueueList();
    }, 10000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========================================
  // FLOW NAVIGATION METHODS
  // ========================================

  // Step 1: Select transaction type
  selectTransactionType(serviceType: string): void {
    this.selectedServiceType = serviceType;

    if (serviceType === 'new_loan') {
      // For new loan, ask if new or existing customer
      this.currentStep = 'customer_type';
    } else {
      // For other transactions, go directly to search
      this.currentStep = 'search';
      this.searchType = 'ticket'; // Default to ticket search
    }

    this.errorMessage = '';
  }

  // Step 2: Select customer type (for new loan only)
  selectCustomerType(type: 'new' | 'existing'): void {
    this.customerType = type;

    if (type === 'new') {
      this.currentStep = 'register';
      this.loadCities();
    } else {
      this.currentStep = 'search';
      this.searchType = 'mobile'; // For existing customers, default to mobile
    }

    this.errorMessage = '';
  }

  // Change search type (ticket or mobile)
  changeSearchType(type: 'ticket' | 'mobile'): void {
    // For renew, redeem, additional_loan, partial_payment: Only allow ticket search
    const ticketOnlyTransactions = ['renew', 'redeem', 'additional_loan', 'partial_payment'];
    if (this.selectedServiceType && ticketOnlyTransactions.includes(this.selectedServiceType) && type === 'mobile') {
      console.log('⚠️ Mobile search not allowed for this transaction type');
      return; // Don't allow mobile search for these transactions
    }

    this.searchType = type;
    this.searchTerm = '';
    this.searchResults = [];
    this.searchPerformed = false;
    this.errorMessage = '';
  }

  // Reset flow (start over)
  resetFlow(): void {
    this.currentStep = 'select_transaction';
    this.selectedServiceType = null;
    this.customerType = null;
    this.searchType = 'ticket';
    this.searchTerm = '';
    this.searchResults = [];
    this.selectedPawner = null;
    this.searchPerformed = false;
    this.errorMessage = '';
    this.resetNewPawnerForm();
  }

  // Reset flow for next customer (kiosk mode - keeps showing queue info)
  resetFlowForNextCustomer(): void {
    this.currentStep = 'select_transaction';
    this.selectedServiceType = null;
    this.customerType = null;
    this.searchType = 'ticket';
    this.searchTerm = '';
    this.searchResults = [];
    this.selectedPawner = null;
    this.searchPerformed = false;
    this.errorMessage = '';
    this.queueEntry = null; // Clear queue entry for next customer
    this.queueCompleted = false; // Clear completion flag
    this.resetNewPawnerForm();
  }

  // ========================================
  // SEARCH METHODS
  // ========================================

  // Search for pawner by ticket or mobile
  searchPawner(): void {
    if (!this.searchTerm || this.searchTerm.length < 3) {
      this.errorMessage = 'Please enter at least 3 characters to search';
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';
    this.searchPerformed = true;

    // If searching by ticket, use transaction search endpoint
    if (this.searchType === 'ticket') {
      // Search by transaction ticket number
      this.http.get<any>(`${this.API_URL}/transactions/search/${encodeURIComponent(this.searchTerm)}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSearching = false;
            if (response.success && response.data) {
              // Found transaction - extract pawner info and create pawner object
              const transaction = response.data;
              const pawner: Pawner = {
                id: transaction.pawnerId,
                firstName: transaction.firstName,
                lastName: transaction.lastName,
                mobileNumber: transaction.pawnerContact || transaction.contactNumber,
                email: transaction.pawnerEmail,
                address: transaction.completeAddress,
                cityId: transaction.cityId,
                barangayId: transaction.barangayId
              };
              this.searchResults = [pawner];
              console.log('✅ Found transaction and extracted pawner:', pawner);
            } else {
              this.searchResults = [];
              // Don't set error message for no results - let the UI show appropriate message
            }
          },
          error: (error) => {
            this.isSearching = false;
            if (error.status === 404) {
              this.searchResults = [];
              // UI will show "No results found" message
            } else {
              this.errorMessage = 'Error searching transaction. Please try again.';
            }
            console.error('Transaction search error:', error);
          }
        });
    } else {
      // Search by mobile number or name (pawner search)
      this.http.get<any>(`${this.API_URL}/pawners/search?q=${encodeURIComponent(this.searchTerm)}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSearching = false;
            this.searchResults = response.data || [];
            // Don't set error message for no results - let the UI show the register button instead
          },
          error: (error) => {
            this.isSearching = false;
            this.errorMessage = 'Error searching pawners. Please try again.';
            console.error('Pawner search error:', error);
          }
        });
    }
  }

  // Select a pawner from search results
  selectPawner(pawner: Pawner): void {
    this.selectedPawner = pawner;
    this.searchResults = [];
    this.searchPerformed = false;
    this.errorMessage = '';
  }

  // Clear selection and start over
  clearSelection(): void {
    this.selectedPawner = null;
    this.searchTerm = '';
    this.searchResults = [];
    this.searchPerformed = false;
    this.errorMessage = '';
  }

  // Join the queue
  joinQueue(): void {
    if (!this.selectedPawner) {
      this.errorMessage = 'Please search and select yourself first';
      return;
    }

    if (!this.selectedServiceType) {
      this.errorMessage = 'Please select a service type';
      return;
    }

    this.isJoiningQueue = true;
    this.errorMessage = '';

    const queueData = {
      pawnerId: this.selectedPawner.id,
      serviceType: this.selectedServiceType,
      isNewPawner: this.customerType === 'new',
      ticketNumber: this.searchType === 'ticket' ? this.searchTerm : null, // Include ticket number if searched by ticket
      notes: ''
    };

    this.http.post<any>(`${this.API_URL}/queue`, queueData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isJoiningQueue = false;
          this.queueEntry = response.data;
          console.log('Joined queue:', this.queueEntry);

          // Refresh queue list to show the new entry
          this.loadQueueList();

          // Reset flow for next customer (kiosk mode)
          setTimeout(() => {
            this.resetFlowForNextCustomer();
          }, 2000); // Give 2 seconds to see confirmation
        },
        error: (error) => {
          this.isJoiningQueue = false;
          this.errorMessage = error.error?.message || 'Failed to join queue. Please try again.';
          console.error('Join queue error:', error);
        }
      });
  }

  // Check if user already in queue
  checkExistingQueue(): void {
    this.http.get<any>(`${this.API_URL}/queue?status=waiting`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            this.queueEntry = response.data[0]; // Get first waiting entry
          }
        },
        error: (error) => {
          console.error('Error checking queue:', error);
        }
      });
  }

  // Load all waiting queue entries (for public display)
  loadQueueList(): void {
    this.loadingQueueList = true;

    // Use public endpoint to see all active queue entries (no auth filtering)
    this.http.get<any>(`${this.API_URL}/queue/public`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingQueueList = false;
          console.log('📦 Raw queue response:', response);
          console.log('📊 Queue data:', response.data);

          // Show all entries for kiosk mode
          this.queueList = response.data || [];

          console.log(`✅ Loaded ${this.queueList.length} queue entries`);
          if (this.queueList.length > 0) {
            console.log('First entry:', this.queueList[0]);
          }

          // Auto-reset if current user's queue entry is completed/cancelled
          if (this.queueEntry) {
            const currentEntry = this.queueList.find(entry => entry.id === this.queueEntry!.id);

            // If entry not found in active queue (completed/cancelled) or status changed
            if (!currentEntry) {
              console.log('🎉 Queue entry completed or removed - resetting for next customer');
              this.queueCompleted = true; // Show completion message
              this.queueEntry = null; // Clear the entry
              setTimeout(() => {
                this.queueCompleted = false;
                this.resetFlowForNextCustomer();
              }, 3000); // Show completion message for 3 seconds
            }
          }
        },
        error: (error) => {
          this.loadingQueueList = false;
          console.error('❌ Error loading queue list:', error);
          this.queueList = [];
        }
      });
  }  // Leave the queue
  leaveQueue(): void {
    if (!this.queueEntry) return;

    if (confirm('Are you sure you want to leave the queue?')) {
      this.http.delete<any>(`${this.API_URL}/queue/${this.queueEntry.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.queueEntry = null;
            this.errorMessage = 'You have left the queue.';
            setTimeout(() => this.errorMessage = '', 3000);
            // Refresh queue list to remove the entry
            this.loadQueueList();
          },
          error: (error) => {
            this.errorMessage = 'Failed to leave queue. Please try again.';
            console.error('Leave queue error:', error);
          }
        });
    }
  }

  // Format service type label
  getServiceTypeLabel(type: string): string {
    const service = this.serviceTypes.find(s => s.value === type);
    return service ? service.label : type;
  }

  // Get position in queue
  getQueuePosition(queueNumber: string): number {
    const index = this.queueList.findIndex(q => q.queueNumber === queueNumber);
    return index >= 0 ? index + 1 : 0;
  }

  // Format queue time
  getQueueTime(joinedAt: string): string {
    const joined = new Date(joinedAt);
    const now = new Date();
    const diffMs = now.getTime() - joined.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  // ========================================
  // REGISTRATION METHODS
  // ========================================

  // Reset new pawner form
  resetNewPawnerForm(): void {
    this.newPawnerForm = {
      firstName: '',
      lastName: '',
      mobileNumber: '',
      email: '',
      address: '',
      cityId: null,
      barangayId: null
    };
    this.barangays = [];
  }

  // Load cities dropdown
  loadCities(): void {
    if (this.cities.length > 0) return; // Already loaded

    this.loadingCities = true;
    this.http.get<any>(`${this.API_URL}/addresses/cities`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingCities = false;
          this.cities = response.data || [];
          console.log(`✅ Loaded ${this.cities.length} cities`);
        },
        error: (error) => {
          this.loadingCities = false;
          console.error('❌ Error loading cities:', error);
          this.errorMessage = 'Failed to load cities';
        }
      });
  }

  // Load barangays when city is selected
  onCityChange(): void {
    this.newPawnerForm.barangayId = null; // Reset barangay
    this.barangays = [];

    if (!this.newPawnerForm.cityId) return;

    this.loadingBarangays = true;
    this.http.get<any>(`${this.API_URL}/addresses/cities/${this.newPawnerForm.cityId}/barangays`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingBarangays = false;
          this.barangays = response.data || [];
          console.log(`✅ Loaded ${this.barangays.length} barangays for city ${this.newPawnerForm.cityId}`);
        },
        error: (error) => {
          this.loadingBarangays = false;
          console.error('❌ Error loading barangays:', error);
          this.errorMessage = 'Failed to load barangays';
        }
      });
  }

  // Validate new pawner form
  isNewPawnerFormValid(): boolean {
    return !!(
      this.newPawnerForm.firstName.trim() &&
      this.newPawnerForm.lastName.trim() &&
      this.newPawnerForm.mobileNumber.trim() &&
      this.newPawnerForm.cityId &&
      this.newPawnerForm.barangayId
    );
  }

  // Register new pawner
  registerNewPawner(): void {
    if (!this.isNewPawnerFormValid()) {
      this.errorMessage = 'Please fill in all required fields (including city and barangay)';
      return;
    }

    this.isRegistering = true;
    this.errorMessage = '';

    const pawnerData = {
      firstName: this.newPawnerForm.firstName.trim(),
      lastName: this.newPawnerForm.lastName.trim(),
      mobileNumber: this.newPawnerForm.mobileNumber.trim(),
      email: this.newPawnerForm.email.trim() || null,
      address: this.newPawnerForm.address.trim() || null,
      cityId: this.newPawnerForm.cityId,
      barangayId: this.newPawnerForm.barangayId
    };

    this.http.post<any>(`${this.API_URL}/pawners`, pawnerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isRegistering = false;

          // Set as selected pawner and auto-join queue
          this.selectedPawner = response.data;

          // Reset form
          this.resetNewPawnerForm();

          console.log('New pawner registered:', response.data);

          // Auto-join queue after registration
          this.joinQueue();
        },
        error: (error) => {
          this.isRegistering = false;
          this.errorMessage = error.error?.message || 'Failed to register. Please try again.';
          console.error('Registration error:', error);
        }
      });
  }
}
