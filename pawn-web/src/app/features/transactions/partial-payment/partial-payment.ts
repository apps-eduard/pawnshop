import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';
import { InvoiceModalComponent } from '../../../shared/modals/invoice-modal/invoice-modal.component';
import { LoanInvoiceData } from '../../../shared/components/loan-invoice/loan-invoice.component';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { NewLoanDatesComponent } from '../../../shared/components/new-loan-dates/new-loan-dates.component';

// Interfaces
interface CustomerInfo {
  contactNumber: string;
  firstName: string;
  lastName: string;
  transactionDate: string;
  grantedDate: string;
  city: string;
  barangay: string;
  maturedDate: string;
  expiredDate: string;
  completeAddress: string;
}

interface TransactionInfo {
  transactionDate: string;
  grantedDate: string;
  maturedDate: string;
  gracePeriodDate?: string; // Maturity date + 3 days (redeem date)
  expiredDate: string;
  loanStatus: string;
  newMaturityDate?: string;      // New maturity date after partial payment
  newGracePeriodDate?: string;   // New redeem date after partial payment
  newExpiryDate?: string;        // New expiry date after partial payment
}

interface PawnedItem {
  id: number;
  category: string;
  categoryDescription: string;
  description: string;
  descriptionName: string;
  appraisalNotes: string;
  appraisalValue: number;
}

interface PartialComputation {
  appraisalValue: number;
  discount: number;
  principalLoan: number;
  interestRate: number;
  interest: number;
  penalty: number;
  partialPay: number;
  newPrincipalLoan: number;
  advanceInterest: number;
  advServiceCharge: number;
  redeemAmount: number;
  netPayment: number;
  amountReceived: number;
  change: number;
}

@Component({
  selector: 'app-partial-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionInfoComponent, InvoiceModalComponent, CurrencyInputDirective, NewLoanDatesComponent],
  templateUrl: './partial-payment.html',
  styleUrl: './partial-payment.css'
})
export class PartialPayment implements OnInit, AfterViewInit {

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('partialPayInput') partialPayInput?: ElementRef<HTMLInputElement>;

  searchTicketNumber = '';
  transactionNumber = '';
  transactionId = 0;
  isLoading = false;
  transactionFound = false;

  customerInfo: CustomerInfo = {
    contactNumber: '',
    firstName: '',
    lastName: '',
    transactionDate: '',
    grantedDate: '',
    city: '',
    barangay: '',
    maturedDate: '',
    expiredDate: '',
    completeAddress: ''
  };

  transactionInfo: TransactionInfo = {
    transactionDate: '',
    grantedDate: '',
    maturedDate: '',
    expiredDate: '',
    loanStatus: '',
    newMaturityDate: '',
    newGracePeriodDate: '',
    newExpiryDate: ''
  };

  pawnedItems: PawnedItem[] = [];

  partialComputation: PartialComputation = {
    appraisalValue: 0,
    discount: 0,
    principalLoan: 0,
    interestRate: 5,
    interest: 0,
    penalty: 0,
    partialPay: 0,
    newPrincipalLoan: 0,
    advanceInterest: 0,
    advServiceCharge: 0,
    redeemAmount: 0,
    netPayment: 0,
    amountReceived: 0,
    change: 0
  };

  // Invoice modal state
  showInvoiceModal: boolean = false;
  invoiceData: LoanInvoiceData | null = null;

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Partial Payment page loaded - form cleared');
  }

  ngAfterViewInit() {
    // Auto-focus the search input field after view initialization
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 0);
  }

  getTotalAppraisalValue(): number {
    return this.pawnedItems.reduce((total, item) => total + item.appraisalValue, 0);
  }

  async calculatePartialPayment() {
    console.log('💰 calculatePartialPayment called with:', {
      principalLoan: this.partialComputation.principalLoan,
      partialPay: this.partialComputation.partialPay,
      interestRate: this.partialComputation.interestRate
    });

    // Update appraisal value from items
    this.partialComputation.appraisalValue = this.getTotalAppraisalValue();

    // ===== GRACE PERIOD CALCULATION (LEGACY SYSTEM MATCH) =====
    // Grace Period: 3 days after maturity date
    // Within grace period (0-3 days): NO interest, NO penalty
    // After grace period (4+ days): FULL interest + FULL penalty based on months overdue

    let isWithinGracePeriod = false;
    let daysAfterMaturity = 0;

    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();
      daysAfterMaturity = Math.floor((now.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if within 3-day grace period (days 0, 1, 2, 3 after maturity)
      isWithinGracePeriod = daysAfterMaturity >= 0 && daysAfterMaturity <= 3;

      console.log(`🎯 GRACE PERIOD CHECK:`, {
        maturityDate: maturityDate.toISOString().split('T')[0],
        currentDate: now.toISOString().split('T')[0],
        daysAfterMaturity,
        isWithinGracePeriod
      });
    }

    // Calculate interest based on grace period
    if (isWithinGracePeriod) {
      // WITHIN GRACE PERIOD: NO INTEREST
      this.partialComputation.interest = 0;
      this.partialComputation.discount = daysAfterMaturity; // Auto-set discount for display

      console.log(`✅ WITHIN GRACE PERIOD: Interest = ₱0.00 (${daysAfterMaturity} days after maturity)`);
    } else if (this.transactionInfo.grantedDate && this.transactionInfo.maturedDate) {
      // AFTER GRACE PERIOD: CALCULATE INTEREST PER DAY
      const grantDate = new Date(this.transactionInfo.grantedDate);
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();

      // Calculate total days from grant date to now
      const totalDays = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));

      // Days beyond the first 30 days (already paid in advance)
      const additionalDays = Math.max(0, totalDays - 30);

      // Calculate interest PER DAY (Monthly rate / 30 days × additional days)
      const monthlyRate = this.partialComputation.interestRate / 100; // 6% = 0.06
      const dailyRate = monthlyRate / 30; // Daily rate = 6% / 30 = 0.002

      // Interest = Principal × Daily Rate × Additional Days
      this.partialComputation.interest = this.partialComputation.principalLoan * dailyRate * additionalDays;
      this.partialComputation.discount = 0; // No discount after grace period

      console.log(`⚠️ AFTER GRACE PERIOD: Interest Calculation (Per Day)`, {
        grantDate: grantDate.toISOString().split('T')[0],
        maturityDate: maturityDate.toISOString().split('T')[0],
        currentDate: now.toISOString().split('T')[0],
        totalDays,
        additionalDays,
        monthlyRate: (monthlyRate * 100).toFixed(0) + '%',
        dailyRate: (dailyRate * 100).toFixed(4) + '%',
        principal: this.partialComputation.principalLoan,
        interestPerDay: (this.partialComputation.principalLoan * dailyRate).toFixed(2),
        totalInterest: this.partialComputation.interest.toFixed(2)
      });
    } else {
      this.partialComputation.interest = 0;
      this.partialComputation.discount = 0;
    }

    // Calculate penalty based on grace period
    if (isWithinGracePeriod) {
      // WITHIN GRACE PERIOD: NO PENALTY
      this.partialComputation.penalty = 0;

      console.log(`✅ WITHIN GRACE PERIOD: Penalty = ₱0.00`);
    } else if (this.transactionInfo.maturedDate) {
      // AFTER GRACE PERIOD: CALCULATE FULL MONTH PENALTY
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();

      // Days after maturity (excluding grace period)
      const daysAfterGracePeriod = Math.max(0, daysAfterMaturity - 3);

      // Calculate penalty for full months (2% × principal × ceil(days/30))
      const penaltyRate = 0.02; // 2% monthly
      const monthsForPenalty = Math.ceil(daysAfterGracePeriod / 30);

      this.partialComputation.penalty = this.partialComputation.principalLoan * penaltyRate * monthsForPenalty;

      console.log(`⚠️ AFTER GRACE PERIOD: Penalty Calculation`, {
        maturityDate: maturityDate.toISOString().split('T')[0],
        currentDate: now.toISOString().split('T')[0],
        daysAfterMaturity,
        daysAfterGracePeriod,
        monthsForPenalty,
        penaltyRate: (penaltyRate * 100).toFixed(0) + '%',
        principal: this.partialComputation.principalLoan,
        penalty: this.partialComputation.penalty.toFixed(2)
      });
    } else {
      this.partialComputation.penalty = 0;
    }

    // Calculate total obligation (principal + interest + penalty)
    const totalObligation = this.partialComputation.principalLoan +
                           this.partialComputation.interest +
                           this.partialComputation.penalty;

    // Calculate redeem amount (what customer needs to pay to fully redeem)
    this.partialComputation.redeemAmount = totalObligation;

    // If partial payment is specified, calculate new principal and advance charges
    if (this.partialComputation.partialPay > 0) {
      // New Principal = Current Principal - Partial Payment
      this.partialComputation.newPrincipalLoan = this.partialComputation.principalLoan - this.partialComputation.partialPay;

      // Calculate advance interest for 1 month on new principal
      const monthlyRate = this.partialComputation.interestRate / 100;
      this.partialComputation.advanceInterest = this.partialComputation.newPrincipalLoan * monthlyRate;

      // Calculate service charge based on new principal
      console.log('🔍 Calculating service charge for amount:', this.partialComputation.newPrincipalLoan);
      this.partialComputation.advServiceCharge = await this.calculateServiceCharge(this.partialComputation.newPrincipalLoan);
      console.log('💵 Service charge calculated:', this.partialComputation.advServiceCharge);

      // Net Payment = Partial Pay + Interest + Penalty + Advance Interest + Adv Service Charge
      this.partialComputation.netPayment =
        this.partialComputation.partialPay +
        this.partialComputation.interest +
        this.partialComputation.penalty +
        this.partialComputation.advanceInterest +
        this.partialComputation.advServiceCharge;

      console.log('📊 Final computation:', {
        partialPay: this.partialComputation.partialPay,
        interest: this.partialComputation.interest,
        penalty: this.partialComputation.penalty,
        advanceInterest: this.partialComputation.advanceInterest,
        advServiceCharge: this.partialComputation.advServiceCharge,
        netPayment: this.partialComputation.netPayment,
        newPrincipalLoan: this.partialComputation.newPrincipalLoan
      });
    } else {
      // No partial payment specified
      console.log('⚠️ No partial payment specified, setting values to 0');
      this.partialComputation.newPrincipalLoan = this.partialComputation.principalLoan;
      this.partialComputation.advanceInterest = 0;
      this.partialComputation.advServiceCharge = 0;
      this.partialComputation.netPayment = 0;
    }

    this.calculateChange();
    this.calculateNewDates(); // Calculate new dates after partial payment
  }

  // Calculate new maturity and expiry dates for the partial payment
  calculateNewDates() {
    if (this.partialComputation.partialPay > 0) {
      const today = new Date();

      // New maturity date = Today + 30 days
      const newMaturity = new Date(today);
      newMaturity.setDate(newMaturity.getDate() + 30);
      this.transactionInfo.newMaturityDate = newMaturity.toISOString().split('T')[0];

      // New grace period = New maturity + 3 days
      const newGracePeriod = new Date(newMaturity);
      newGracePeriod.setDate(newGracePeriod.getDate() + 3);
      this.transactionInfo.newGracePeriodDate = newGracePeriod.toISOString().split('T')[0];

      // New expiry date = New maturity + 90 days
      const newExpiry = new Date(newMaturity);
      newExpiry.setDate(newExpiry.getDate() + 90);
      this.transactionInfo.newExpiryDate = newExpiry.toISOString().split('T')[0];

      console.log('📅 New Dates Calculated for Partial Payment:');
      console.log('  New Maturity:', this.transactionInfo.newMaturityDate);
      console.log('  New Grace Period:', this.transactionInfo.newGracePeriodDate);
      console.log('  New Expiry:', this.transactionInfo.newExpiryDate);
    } else {
      // Clear new dates if no partial payment
      this.transactionInfo.newMaturityDate = '';
      this.transactionInfo.newGracePeriodDate = '';
      this.transactionInfo.newExpiryDate = '';
    }
  }

  async calculateServiceCharge(amount: number): Promise<number> {
    // Use fixed tier-based service charge calculation
    return this.calculateTierBasedServiceCharge(amount);
  }

  calculateTierBasedServiceCharge(amount: number): number {
    // Fixed tier-based service charge:
    // 1-100 = ₱1
    // 101-299 = ₱2
    // 300-399 = ₱3
    // 400-499 = ₱4
    // 500+ = ₱5

    if (amount >= 1 && amount <= 100) return 1;
    if (amount >= 101 && amount <= 299) return 2;
    if (amount >= 300 && amount <= 399) return 3;
    if (amount >= 400 && amount <= 499) return 4;
    if (amount >= 500) return 5;

    return 0; // For amounts less than 1
  }

  calculateFallbackServiceCharge(amount: number): number {
    // Kept for backward compatibility, but now uses tier-based calculation
    return this.calculateTierBasedServiceCharge(amount);
  }

  getPenaltyInfo(): string {
    if (this.partialComputation.penalty === 0) {
      return 'No penalty (within grace period or not yet matured)';
    }

    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 3) {
        return `Daily penalty (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)`;
      } else {
        return `Full month penalty (${daysOverdue} days overdue)`;
      }
    }

    return 'Penalty calculated based on days overdue';
  }

  getInterestInfo(): string {
    if (this.transactionInfo.grantedDate) {
      const grantDate = new Date(this.transactionInfo.grantedDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));
      const monthlyRate = this.partialComputation.interestRate;
      const dailyRate = monthlyRate / 30;

      return `Interest: ${monthlyRate}% monthly (${dailyRate.toFixed(4)}% daily) for ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
    }
    return 'Interest calculation based on days from grant date';
  }

  calculateChange() {
    // Keep change at 0 when no amount received
    if (this.partialComputation.amountReceived === 0) {
      this.partialComputation.change = 0;
    } else {
      this.partialComputation.change =
        this.partialComputation.amountReceived - this.partialComputation.netPayment;
    }
  }

  canProcessPayment(): boolean {
    return this.transactionFound &&
           this.partialComputation.amountReceived >= this.partialComputation.netPayment &&
           this.partialComputation.partialPay > 0 &&
           this.pawnedItems.length > 0;
  }

  resetForm() {
    this.searchTicketNumber = '';
    this.clearForm();
    this.toastService.showInfo('Reset', 'Form has been reset');
  }

  async searchTransaction() {
    if (!this.searchTicketNumber.trim()) {
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
        console.log('🔍 SEARCH RESPONSE - Full data:', result.data);
        console.log('📅 REDEEM DATE - gracePeriodDate from backend:', result.data.gracePeriodDate);
        console.log('📅 REDEEM DATE - All date fields:', {
          transactionDate: result.data.transactionDate,
          dateGranted: result.data.dateGranted,
          dateMatured: result.data.dateMatured,
          gracePeriodDate: result.data.gracePeriodDate,
          dateExpired: result.data.dateExpired
        });
        await this.populateForm(result.data); // Await the async populateForm
        this.transactionFound = true;
        // Focus on partial pay input after successful search
        setTimeout(() => {
          this.partialPayInput?.nativeElement.focus();
        }, 100);
      } else {
        this.toastService.showError('Not Found', result.message || 'Transaction not found');
        this.transactionFound = false;
        // Keep focus on search input for retry
        setTimeout(() => {
          this.searchInput?.nativeElement.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      this.toastService.showError('Error', 'Failed to search transaction');
      this.transactionFound = false;
      // Keep focus on search input for retry
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 100);
    } finally {
      this.isLoading = false;
    }
  }

  private async populateForm(data: any) {
    // Set transaction number and ID
    this.transactionNumber = data.ticketNumber;
    this.transactionId = data.id || 0; // Use data.id which is the transaction ID

    // Populate customer info
    this.customerInfo = {
      contactNumber: data.contactNumber || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      transactionDate: this.formatDateDisplay(data.transactionDate),
      grantedDate: this.formatDateDisplay(data.dateGranted),
      city: data.cityName || '',
      barangay: data.barangayName || '',
      maturedDate: this.formatDateDisplay(data.dateMatured),
      expiredDate: this.formatDateDisplay(data.dateExpired),
      completeAddress: data.completeAddress || ''
    };

    // Populate transaction info
    this.transactionInfo = {
      transactionDate: this.formatDate(data.transactionDate),
      grantedDate: this.formatDate(data.dateGranted),
      maturedDate: this.formatDate(data.dateMatured),
      gracePeriodDate: data.gracePeriodDate ? this.formatDate(data.gracePeriodDate) : undefined,
      expiredDate: this.formatDate(data.dateExpired),
      loanStatus: this.getStatusText(data.status)
    };

    console.log('✅ TRANSACTION INFO POPULATED:', this.transactionInfo);
    console.log('📅 REDEEM DATE - After formatting:', this.transactionInfo.gracePeriodDate);

    // Populate items
    this.pawnedItems = (data.items || []).map((item: any, index: number) => ({
      id: index + 1,
      category: item.category || '',
      categoryDescription: item.categoryDescription || '',
      description: item.description || '',
      descriptionName: item.descriptionName || item.description || '',
      appraisalNotes: item.appraisalNotes || item.notes || '',
      appraisalValue: parseFloat(item.appraisalValue || 0)
    }));

    // Populate partial computation
    this.partialComputation = {
      appraisalValue: this.getTotalAppraisalValue(),
      discount: 0,
      principalLoan: data.principalAmount || 0,
      interestRate: data.interestRate || 5,
      interest: 0, // Will be calculated
      penalty: data.penaltyAmount || 0,
      partialPay: 0,
      newPrincipalLoan: 0, // Will be calculated
      advanceInterest: 0, // Will be calculated
      advServiceCharge: 0,
      redeemAmount: 0, // Will be calculated
      netPayment: 0, // Will be calculated
      amountReceived: 0,
      change: 0
    };

    // Calculate partial payment amounts
    console.log('🔄 About to calculate partial payment...');
    await this.calculatePartialPayment(); // Await the async calculation
    console.log('✅ Partial payment calculated:', {
      newPrincipalLoan: this.partialComputation.newPrincipalLoan,
      advanceInterest: this.partialComputation.advanceInterest,
      advServiceCharge: this.partialComputation.advServiceCharge,
      netPayment: this.partialComputation.netPayment
    });
  }

  private clearForm() {
    this.transactionNumber = '';
    this.transactionId = 0;
    this.transactionFound = false;

    this.customerInfo = {
      contactNumber: '',
      firstName: '',
      lastName: '',
      transactionDate: '',
      grantedDate: '',
      city: '',
      barangay: '',
      maturedDate: '',
      expiredDate: '',
      completeAddress: ''
    };

    this.transactionInfo = {
      transactionDate: '',
      grantedDate: '',
      maturedDate: '',
      expiredDate: '',
      loanStatus: '',
      newMaturityDate: '',
      newGracePeriodDate: '',
      newExpiryDate: ''
    };

    this.pawnedItems = [];

    this.partialComputation = {
      appraisalValue: 0,
      discount: 0,
      principalLoan: 0,
      interestRate: 5,
      interest: 0,
      penalty: 0,
      partialPay: 0,
      newPrincipalLoan: 0,
      advanceInterest: 0,
      advServiceCharge: 0,
      redeemAmount: 0,
      netPayment: 0,
      amountReceived: 0,
      change: 0
    };
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  private formatDateDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
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

  goBack() {
    this.location.back();
  }

  async processPayment() {
    if (!this.canProcessPayment()) {
      this.toastService.showError('Error', 'Amount received is insufficient');
      return;
    }

    if (!this.transactionId) {
      this.toastService.showError('Error', 'Transaction ID not found');
      return;
    }

    this.isLoading = true;

    try {
      const paymentData = {
        ticketId: this.transactionId, // Backend expects 'ticketId', not 'transactionId'
        partialPayment: this.partialComputation.partialPay,
        newPrincipalLoan: this.partialComputation.newPrincipalLoan, // Backend expects 'newPrincipalLoan', not 'newPrincipal'
        discountAmount: this.partialComputation.discount || 0,
        advanceInterest: this.partialComputation.advanceInterest,
        netPayment: this.partialComputation.netPayment,
        notes: `Partial payment - Change: ₱${this.partialComputation.change.toFixed(2)}`
      };

      console.log('💳 Sending partial payment data:', paymentData);

      const response = await fetch('http://localhost:3000/api/transactions/partial-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success) {
        // Prepare invoice data
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        this.invoiceData = {
          transactionType: 'partial_payment',
          transactionNumber: result.data?.transactionId || this.transactionNumber,
          ticketNumber: this.searchTicketNumber,
          transactionDate: new Date(),
          pawnerName: `${this.customerInfo.firstName} ${this.customerInfo.lastName}`,
          pawnerContact: this.customerInfo.contactNumber,
          pawnerAddress: this.customerInfo.completeAddress || 'N/A',
          items: this.pawnedItems.map(item => ({
            category: item.category || 'N/A',
            description: item.description || 'N/A',
            appraisedValue: item.appraisalValue || 0
          })),
          principalAmount: this.partialComputation.principalLoan,
          interestRate: this.partialComputation.interestRate,
          interestAmount: this.partialComputation.interest,
          serviceCharge: this.partialComputation.advServiceCharge,
          paymentAmount: this.partialComputation.amountReceived,
          totalAmount: this.partialComputation.netPayment,
          previousBalance: this.partialComputation.principalLoan,
          remainingBalance: this.partialComputation.newPrincipalLoan,
          loanDate: new Date(this.transactionInfo.grantedDate),
          maturityDate: new Date(this.transactionInfo.maturedDate),
          expiryDate: new Date(this.transactionInfo.expiredDate),
          branchName: user.branch_name || 'Main Branch',
          cashierName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          notes: `Partial Payment - Change: ₱${this.partialComputation.change.toFixed(2)}`
        };

        // Show invoice modal
        this.showInvoiceModal = true;
      } else {
        this.toastService.showError('Error', result.message || 'Failed to process partial payment');
      }
    } catch (error) {
      console.error('Error processing partial payment:', error);
      this.toastService.showError('Error', 'Failed to process partial payment');
    } finally {
      this.isLoading = false;
    }
  }

  getLoanStatusClass(): string {
    switch (this.transactionInfo.loanStatus.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'matured':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'premature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  getYearsDifference(): number {
    const granted = new Date(this.transactionInfo.grantedDate);
    const now = new Date();
    return Math.floor((now.getTime() - granted.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }

  getMonthsDifference(): number {
    const granted = new Date(this.transactionInfo.grantedDate);
    const now = new Date();
    return Math.floor((now.getTime() - granted.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }

  getDaysDifference(): number {
    const granted = new Date(this.transactionInfo.grantedDate);
    const now = new Date();
    return Math.floor((now.getTime() - granted.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Close invoice modal and navigate back
  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceData = null;
    this.router.navigate(['/cashier-dashboard']);
  }
}
