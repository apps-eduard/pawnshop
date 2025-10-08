import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent, CustomerInfo, TransactionInfo, PawnedItem } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';
import { TransactionCalculationService } from '../../../core/services/transaction-calculation.service';
import { InvoiceModalComponent } from '../../../shared/modals/invoice-modal/invoice-modal.component';
import { LoanInvoiceData } from '../../../shared/components/loan-invoice/loan-invoice.component';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';

interface RedeemComputation {
  principalLoan: number;
  interestRate: number;
  interest: number;
  penalty: number;
  dueAmount: number;
  discount: number;
  redeemAmount: number;
  receivedAmount: number;
  change: number;
}

@Component({
  selector: 'app-redeem',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionInfoComponent, InvoiceModalComponent, CurrencyInputDirective],
  templateUrl: './redeem.html',
  styleUrl: './redeem.css'
})
export class Redeem implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('receivedAmountInput') receivedAmountInput?: ElementRef<HTMLInputElement>;

  searchTicketNumber: string = '';
  transactionNumber: string = '';
  transactionId: number = 0; // Add transaction ID field
  isLoading: boolean = false;
  isProcessing: boolean = false;
  transactionFound: boolean = false;

  customerInfo: CustomerInfo = {
    contactNumber: '',
    firstName: '',
    lastName: '',
    city: '',
    barangay: '',
    completeAddress: ''
  };

  transactionInfo: TransactionInfo = {
    transactionDate: '',
    grantedDate: '',
    maturedDate: '',
    expiredDate: ''
  };

  items: PawnedItem[] = [];

  redeemComputation: RedeemComputation = {
    principalLoan: 0,
    interestRate: 0,
    interest: 0,
    penalty: 0,
    dueAmount: 0,
    discount: 0,
    redeemAmount: 0,
    receivedAmount: 0,
    change: 0
  };

  // Invoice modal state
  showInvoiceModal: boolean = false;
  invoiceData: LoanInvoiceData | null = null;

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService,
    private transactionCalcService: TransactionCalculationService
  ) {}

  onSearchTicket(ticketNumber: string) {
    console.log('Parent onSearchTicket called with:', ticketNumber);
    this.searchTicketNumber = ticketNumber;
    this.searchTransaction();
  }

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Redeem page loaded - form cleared');
  }

  ngAfterViewInit() {
    // Auto-focus on search input when page loads
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  getTotalAppraisalValue(): number {
    return this.items.reduce((total, item) => total + (item.appraisalValue || item.appraisedValue || 0), 0);
  }

  getPenaltyInfo(): string {
    if (!this.transactionInfo.maturedDate) return 'N/A';

    const maturityDate = new Date(this.transactionInfo.maturedDate);
    const currentDate = new Date();
    const daysOverdue = Math.max(0, Math.ceil((currentDate.getTime() - maturityDate.getTime()) / (1000 * 3600 * 24)));

    if (daysOverdue === 0) {
      return 'No penalty - Not overdue';
    } else if (daysOverdue <= 3) {
      return `Daily penalty: ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
    } else {
      return `Full month penalty: ${daysOverdue} days overdue`;
    }
  }

  getInterestInfo(): string {
    if (!this.transactionInfo.transactionDate || !this.transactionInfo.grantedDate) return 'N/A';

    const loanDate = this.transactionInfo.grantedDate
      ? new Date(this.transactionInfo.grantedDate)
      : new Date(this.transactionInfo.transactionDate);
    const currentDate = new Date();
    const days = Math.ceil((currentDate.getTime() - loanDate.getTime()) / (1000 * 3600 * 24));

    return `${days} day${days !== 1 ? 's' : ''} at ${this.redeemComputation.interestRate}% monthly rate`;
  }

  // Use global transaction calculation service for consistency
  getLoanStatus(): string {
    return this.transactionCalcService.getLoanStatus(
      this.transactionInfo.maturedDate,
      this.transactionInfo.expiredDate
    );
  }

  getLoanStatusClass(): string {
    const status = this.getLoanStatus();
    return this.transactionCalcService.getStatusClass(status);
  }

  getDurationBadgeColors(): {years: string, months: string, days: string} {
    const status = this.getLoanStatus();
    return this.transactionCalcService.getDurationBadgeColors(status);
  }

  getDurationAnimationClass(): string {
    const status = this.getLoanStatus();
    return this.transactionCalcService.getDurationAnimationClass(status);
  }

  getYearsDifference(): number {
    const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
    return duration.years;
  }

  getMonthsDifference(): number {
    const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
    return duration.months;
  }

  getDaysDifference(): number {
    const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
    return duration.days;
  }

  calculateRedeemAmount() {
    // Validate required dates
    if (!this.transactionInfo.transactionDate || !this.transactionInfo.maturedDate) {
      console.warn('Missing required dates for calculation');
      return;
    }

    console.log('Calculating redeem amount with:', {
      principal: this.redeemComputation.principalLoan,
      interestRate: this.redeemComputation.interestRate,
      transactionDate: this.transactionInfo.transactionDate,
      maturedDate: this.transactionInfo.maturedDate,
      grantedDate: this.transactionInfo.grantedDate
    });

    // Use granted date or transaction date for interest calculation
    const grantDate = this.transactionInfo.grantedDate
      ? new Date(this.transactionInfo.grantedDate)
      : new Date(this.transactionInfo.transactionDate);

    const maturityDate = new Date(this.transactionInfo.maturedDate);
    const currentDate = new Date();

    // ===== GRACE PERIOD CALCULATION (SAME AS PARTIAL PAYMENT) =====
    // Grace Period: 3 days after maturity date
    // Within grace period (0-3 days): NO interest, NO penalty
    // After grace period (4+ days): Interest based on days beyond first 30 days + penalty

    let isWithinGracePeriod = false;
    let daysAfterMaturity = 0;

    if (this.transactionInfo.maturedDate) {
      daysAfterMaturity = Math.floor((currentDate.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if within 3-day grace period (days 0, 1, 2, 3 after maturity)
      isWithinGracePeriod = daysAfterMaturity >= 0 && daysAfterMaturity <= 3;

      console.log(`🎯 GRACE PERIOD CHECK:`, {
        maturityDate: maturityDate.toISOString().split('T')[0],
        currentDate: currentDate.toISOString().split('T')[0],
        daysAfterMaturity,
        isWithinGracePeriod
      });
    }

    // Calculate interest based on grace period and additional days
    if (isWithinGracePeriod) {
      // WITHIN GRACE PERIOD: NO INTEREST
      this.redeemComputation.interest = 0;
      this.redeemComputation.discount = daysAfterMaturity; // Auto-set discount for display

      console.log(`✅ WITHIN GRACE PERIOD: Interest = ₱0.00 (${daysAfterMaturity} days after maturity)`);
    } else {
      // AFTER GRACE PERIOD OR BEFORE MATURITY: Calculate interest for additional days only
      const totalDays = Math.floor((currentDate.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Days beyond the first 30 days (already paid in advance)
      const additionalDays = Math.max(0, totalDays - 30);

      if (additionalDays > 0) {
        // Calculate interest PER DAY for additional days only
        const monthlyRate = this.redeemComputation.interestRate / 100; // 6% = 0.06
        const dailyRate = monthlyRate / 30; // Daily rate = 6% / 30 = 0.002
        
        // Interest = Principal × Daily Rate × Additional Days
        this.redeemComputation.interest = this.redeemComputation.principalLoan * dailyRate * additionalDays;
        this.redeemComputation.discount = 0;

        console.log(`⚠️ INTEREST CALCULATION (Additional Days):`, {
          grantDate: grantDate.toISOString().split('T')[0],
          maturityDate: maturityDate.toISOString().split('T')[0],
          currentDate: currentDate.toISOString().split('T')[0],
          totalDays,
          additionalDays,
          monthlyRate: (monthlyRate * 100).toFixed(0) + '%',
          dailyRate: (dailyRate * 100).toFixed(4) + '%',
          principal: this.redeemComputation.principalLoan,
          interestPerDay: (this.redeemComputation.principalLoan * dailyRate).toFixed(2),
          totalInterest: this.redeemComputation.interest.toFixed(2)
        });
      } else {
        // Within first 30 days: NO INTEREST (already paid in advance)
        this.redeemComputation.interest = 0;
        this.redeemComputation.discount = 0;

        console.log(`✅ WITHIN FIRST 30 DAYS: Interest = ₱0.00 (day ${totalDays} of first month)`);
      }
    }

    // Calculate penalty using the PenaltyCalculatorService
    const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
      this.redeemComputation.principalLoan,
      maturityDate,
      currentDate
    );

    this.redeemComputation.penalty = penaltyDetails.penaltyAmount;

    console.log('Penalty calculation:', {
      daysOverdue: penaltyDetails.daysOverdue,
      calculationMethod: penaltyDetails.calculationMethod,
      penaltyAmount: penaltyDetails.penaltyAmount
    });

    // Calculate due amount
    this.redeemComputation.dueAmount =
      this.redeemComputation.principalLoan +
      this.redeemComputation.interest +
      this.redeemComputation.penalty;

    // Calculate redeem amount with discount
    this.redeemComputation.redeemAmount =
      this.redeemComputation.dueAmount - this.redeemComputation.discount;

    console.log('Final calculation:', {
      principal: this.redeemComputation.principalLoan,
      interest: this.redeemComputation.interest,
      penalty: this.redeemComputation.penalty,
      dueAmount: this.redeemComputation.dueAmount,
      discount: this.redeemComputation.discount,
      redeemAmount: this.redeemComputation.redeemAmount
    });

    // Calculate change if received amount is set
    this.calculateChange();
  }

  calculateChange() {
    // Keep change at 0 when no amount received or received amount is 0
    if (!this.redeemComputation.receivedAmount || this.redeemComputation.receivedAmount === 0) {
      this.redeemComputation.change = 0;
    } else {
      this.redeemComputation.change =
        this.redeemComputation.receivedAmount - this.redeemComputation.redeemAmount;
    }
  }

  canProcessRedeem(): boolean {
    return this.transactionFound &&
           this.redeemComputation.receivedAmount >= this.redeemComputation.redeemAmount &&
           this.items.length > 0 &&
           this.redeemComputation.redeemAmount > 0;
  }

  async searchTransaction() {
    console.log('searchTransaction called with searchTicketNumber:', this.searchTicketNumber);
    if (!this.searchTicketNumber.trim()) {
      console.log('Search ticket number is empty or whitespace');
      this.toastService.showError('Error', 'Please enter a transaction number');
      return;
    }

    this.isLoading = true;
    this.clearForm();

    try {
      const response = await fetch(`http://localhost:3000/api/transactions/search/${this.searchTicketNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        this.populateForm(result.data);
        this.transactionFound = true;

        // Focus on received amount input after successful search
        setTimeout(() => {
          this.receivedAmountInput?.nativeElement.focus();
        }, 100);
      } else {
        this.toastService.showError('Not Found', result.message || 'Transaction not found');
        this.transactionFound = false;

        // Keep focus on search input if not found
        setTimeout(() => {
          this.searchInput?.nativeElement.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      this.toastService.showError('Error', 'Failed to search transaction');
      this.transactionFound = false;

      // Keep focus on search input on error
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 100);
    } finally {
      this.isLoading = false;
    }
  }

  private populateForm(data: any) {
    console.log('Populating form with data:', data);
    console.log('Customer data fields:', {
      contactNumber: data.contactNumber,
      pawnerContact: data.pawnerContact,
      firstName: data.firstName,
      lastName: data.lastName,
      cityName: data.cityName,
      barangayName: data.barangayName,
      completeAddress: data.completeAddress,
      status: data.status
    });

    // Set transaction number and ID
    this.transactionNumber = data.ticketNumber || data.transactionNumber;
    this.transactionId = data.id || 0; // Store the transaction ID

    // Populate customer info - try multiple field mappings
    this.customerInfo = {
      contactNumber: data.contactNumber || data.pawnerContact || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      city: data.cityName || '',
      barangay: data.barangayName || '',
      completeAddress: data.completeAddress || ''
    };

    // Populate transaction info
    console.log('🗓️ Date fields from API:', {
      transactionDate: data.transactionDate,
      dateGranted: data.dateGranted,
      loanDate: data.loanDate,
      dateMatured: data.dateMatured,
      maturityDate: data.maturityDate,
      dateExpired: data.dateExpired,
      expiryDate: data.expiryDate
    });

    this.transactionInfo = {
      transactionDate: this.formatDate(data.transactionDate),
      grantedDate: this.formatDate(data.dateGranted || data.loanDate),
      maturedDate: this.formatDate(data.dateMatured || data.maturityDate),
      expiredDate: this.formatDate(data.dateExpired || data.expiryDate),
      gracePeriodDate: this.calculateGracePeriodDate(data.dateMatured || data.maturityDate)
    };

    console.log('🗓️ Formatted transactionInfo:', this.transactionInfo);

    // Populate items - map to component interface structure
    console.log('Items data from API:', data.items);
    this.items = (data.items || []).map((item: any) => {
      console.log('Mapping item:', item);
      return {
        categoryName: item.categoryName || item.category || '',
        itemName: item.itemName || item.description || '',
        description: item.description || '',
        descriptionName: item.descriptionName || item.description || '',
        appraisedValue: item.appraisedValue || item.appraisalValue || 0,
        appraisalValue: item.appraisalValue || item.appraisedValue || 0,
        appraisalNotes: item.appraisalNotes || item.notes || '',
        category: item.categoryName || item.category || ''
      };
    });

    // Populate redeem computation
    // Use new_principal_loan from most recent child transaction (partial payment) if exists
    let currentPrincipal = data.principalAmount || 0;

    console.log('🔍 Transaction data received:', {
      principalAmount: data.principalAmount,
      hasTransactionHistory: !!data.transactionHistory,
      historyLength: data.transactionHistory?.length || 0,
      transactionHistory: data.transactionHistory
    });

    if (data.transactionHistory && data.transactionHistory.length > 0) {
      // Find the most recent transaction with new_principal_loan
      const mostRecentWithNewPrincipal = [...data.transactionHistory]
        .reverse()
        .find((t: any) => t.newPrincipalLoan && t.newPrincipalLoan > 0);

      if (mostRecentWithNewPrincipal) {
        currentPrincipal = mostRecentWithNewPrincipal.newPrincipalLoan;
        console.log('✅ Using new principal from transaction history:', {
          originalPrincipal: data.principalAmount,
          newPrincipal: currentPrincipal,
          fromTransaction: mostRecentWithNewPrincipal.transactionNumber,
          transactionType: mostRecentWithNewPrincipal.transactionType
        });
      } else {
        console.log('⚠️ No transaction with newPrincipalLoan found in history');
      }
    } else {
      console.log('⚠️ No transaction history found, using original principal');
    }

    this.redeemComputation = {
      principalLoan: currentPrincipal,
      interestRate: data.interestRate || 0,
      interest: 0, // Will be calculated
      penalty: data.penaltyAmount || 0,
      dueAmount: 0, // Will be calculated
      discount: 0,
      redeemAmount: 0, // Will be calculated
      receivedAmount: 0,
      change: 0
    };

    // Calculate redeem amount
    this.calculateRedeemAmount();
  }

  private clearForm() {
    this.transactionNumber = '';
    this.transactionId = 0; // Clear transaction ID
    this.transactionFound = false;

    this.customerInfo = {
      contactNumber: '',
      firstName: '',
      lastName: '',
      city: '',
      barangay: '',
      completeAddress: ''
    };

    this.transactionInfo = {
      transactionDate: '',
      grantedDate: '',
      maturedDate: '',
      expiredDate: ''
    };

    this.items = [];

    this.redeemComputation = {
      principalLoan: 0,
      interestRate: 0,
      interest: 0,
      penalty: 0,
      dueAmount: 0,
      discount: 0,
      redeemAmount: 0,
      receivedAmount: 0,
      change: 0
    };
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  private calculateGracePeriodDate(maturityDateString: string): string {
    if (!maturityDateString) return '';
    const maturityDate = new Date(maturityDateString);
    const gracePeriodDate = new Date(maturityDate);
    gracePeriodDate.setDate(gracePeriodDate.getDate() + 3); // Add 3 days
    return gracePeriodDate.toISOString().split('T')[0];
  }

  private getStatusText(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'Active';
      case 'matured': return 'Matured';
      case 'expired': return 'Expired';
      case 'redeemed': return 'Redeemed';
      case 'defaulted': return 'Defaulted';
      default: return status || 'Unknown';
    }
  }

  resetForm() {
    this.searchTicketNumber = '';
    this.clearForm();
    this.toastService.showInfo('Reset', 'Form has been reset');
  }

  async processRedeem() {
    if (!this.canProcessRedeem()) {
      this.toastService.showError('Error', 'Please ensure all requirements are met');
      return;
    }

    if (!this.transactionId || !this.transactionNumber) {
      this.toastService.showError('Error', 'Transaction information is required');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('Processing redeem with transaction ID:', this.transactionId);

      const response = await fetch('http://localhost:3000/api/transactions/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ticketId: this.transactionId, // Send transaction ID (integer)
          transactionNumber: this.transactionNumber, // Also send transaction number for reference
          redeemAmount: this.redeemComputation.redeemAmount,
          penaltyAmount: this.redeemComputation.penalty,
          discountAmount: this.redeemComputation.discount,
          totalDue: this.redeemComputation.dueAmount,
          notes: `Redeemed with change: ₱${this.redeemComputation.change.toFixed(2)}`
        })
      });

      const result = await response.json();

      if (result.success) {
        // Prepare invoice data
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        this.invoiceData = {
          transactionType: 'redemption',
          transactionNumber: result.data?.transactionId || this.transactionNumber,
          ticketNumber: this.searchTicketNumber,
          transactionDate: new Date(),
          pawnerName: `${this.customerInfo.firstName} ${this.customerInfo.lastName}`,
          pawnerContact: this.customerInfo.contactNumber,
          pawnerAddress: this.customerInfo.completeAddress || 'N/A',
          items: this.items.map(item => ({
            category: item.category || 'N/A',
            description: item.description || 'N/A',
            appraisedValue: item.appraisalValue || item.appraisedValue || 0
          })),
          principalAmount: this.redeemComputation.principalLoan,
          interestRate: this.redeemComputation.interestRate,
          interestAmount: this.redeemComputation.interest,
          serviceCharge: this.redeemComputation.penalty,
          paymentAmount: this.redeemComputation.receivedAmount,
          totalAmount: this.redeemComputation.redeemAmount,
          previousBalance: this.redeemComputation.dueAmount,
          remainingBalance: -this.redeemComputation.change, // Negative means change given
          loanDate: new Date(this.transactionInfo.grantedDate),
          maturityDate: new Date(this.transactionInfo.maturedDate),
          expiryDate: new Date(this.transactionInfo.expiredDate),
          branchName: user.branch_name || 'Main Branch',
          cashierName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          notes: `Redeemed - Change: ₱${this.redeemComputation.change.toFixed(2)}`
        };

        // Show invoice modal
        this.showInvoiceModal = true;
      } else {
        this.toastService.showError('Error', result.message || 'Failed to process redeem transaction');
      }
    } catch (error) {
      console.error('Error processing redeem:', error);
      this.toastService.showError('Error', 'Failed to process redeem transaction');
    } finally {
      this.isProcessing = false;
    }
  }

  // Close invoice modal and navigate back
  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceData = null;
    this.router.navigate(['/cashier-dashboard']);
  }

  goBack() {
    this.location.back();
  }
}
