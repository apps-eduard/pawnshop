import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';
import { TransactionDateService } from '../../../core/services/transaction-date.service';
import { InvoiceModalComponent } from '../../../shared/modals/invoice-modal/invoice-modal.component';
import { LoanInvoiceData } from '../../../shared/components/loan-invoice/loan-invoice.component';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { NewLoanDatesComponent } from '../../../shared/components/new-loan-dates/new-loan-dates.component';

interface CustomerInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  contactNumber: string;
  address: string;
  city: string;
  barangay: string;
}

interface TransactionInfo {
  transactionNumber: string;
  transactionDate: string;
  grantedDate: string;
  maturedDate: string;
  gracePeriodDate?: string;    // Grace period date of CURRENT loan
  expiredDate: string;
  loanStatus: string;
  newMaturityDate?: string;    // New maturity date after renew
  newExpiryDate?: string;      // New expiry date after renew
  newGracePeriodDate?: string; // New grace period (redeem date) after renew
}

interface PawnedItem {
  category: string;
  categoryDescription: string;
  description: string;
  descriptionName: string;
  appraisalNotes: string;
  appraisalValue: number;
}

interface RenewComputation {
  principalLoan: number;
  interestRate: number;
  discount: number;
  interest: number;
  penalty: number;
  dueAmount: number;
  newLoanAmount: number;
  advanceInterest: number;
  advServiceCharge: number;
  serviceFee: number;
  totalRenewAmount: number;
  receivedAmount: number;
  change: number;
}

@Component({
  selector: 'app-renew',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionInfoComponent, InvoiceModalComponent, CurrencyInputDirective, NewLoanDatesComponent],
  templateUrl: './renew.html',
  styleUrl: './renew.css'
})
export class Renew implements OnInit, AfterViewInit {

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('receivedAmountInput') receivedAmountInput?: ElementRef<HTMLInputElement>;

  searchTicketNumber: string = '';
  transactionId: number = 0;
  isLoading: boolean = false;
  transactionFound: boolean = false;

  customerInfo: CustomerInfo = {
    firstName: '',
    lastName: '',
    middleName: '',
    contactNumber: '',
    address: '',
    city: '',
    barangay: ''
  };

  transactionInfo: TransactionInfo = {
    transactionNumber: '',
    transactionDate: '',
    grantedDate: '',
    maturedDate: '',
    expiredDate: '',
    loanStatus: '',
    newMaturityDate: '',
    newExpiryDate: '',
    newGracePeriodDate: ''
  };

  items: PawnedItem[] = [];

  renewComputation: RenewComputation = {
    principalLoan: 0,
    interestRate: 3.5,
    discount: 0,
    interest: 0,
    penalty: 0,
    dueAmount: 0,
    newLoanAmount: 0,
    advanceInterest: 0,
    advServiceCharge: 0,
    serviceFee: 0,
    totalRenewAmount: 0,
    receivedAmount: 0,
    change: 0
  };

  searchQuery: string = ''; // Keep for backward compatibility

  // Invoice modal state
  showInvoiceModal: boolean = false;
  invoiceData: LoanInvoiceData | null = null;

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService,
    private transactionDateService: TransactionDateService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Renew page loaded - form cleared');
  }

  ngAfterViewInit() {
    // Auto-focus on search input when page loads
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  async searchTransaction() {
    const ticketNumber = this.searchTicketNumber || this.searchQuery; // Support both properties

    if (!ticketNumber.trim()) {
      this.toastService.showError('Error', 'Please enter a transaction number');
      return;
    }

    this.isLoading = true;
    this.clearForm();

    try {
      const response = await fetch(`http://localhost:3000/api/transactions/search/${ticketNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        // **TRACKING CHAIN VALIDATION**
        // Check if this transaction has been superseded by newer transactions
        const transactionHistory = result.data.transactionHistory || [];
        const currentTransactionNumber = result.data.ticketNumber || result.data.transactionNumber;

        // If there's transaction history, check if this is the latest transaction
        if (transactionHistory.length > 0) {
          // Sort by creation date to get the latest transaction
          const sortedHistory = [...transactionHistory].sort((a: any, b: any) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          const latestTransaction = sortedHistory[0];
          const isLatestTransaction = latestTransaction.transactionNumber === currentTransactionNumber;

          if (!isLatestTransaction) {
            // This is an old transaction in the chain
            this.toastService.showError(
              'Transaction Superseded',
              `This transaction has been superseded. Please search for the latest transaction: ${latestTransaction.transactionNumber}`
            );
            this.transactionFound = false;
            this.isLoading = false;
            return;
          }
        }

        // Check if transaction status allows renewal
        const status = (result.data.status || '').toLowerCase();
        if (status === 'redeemed') {
          this.toastService.showError('Transaction Closed', 'This transaction has been redeemed and cannot be renewed');
          this.transactionFound = false;
          this.isLoading = false;
          return;
        }

        if (status === 'defaulted') {
          this.toastService.showError('Transaction Defaulted', 'This transaction has been defaulted and cannot be renewed');
          this.transactionFound = false;
          this.isLoading = false;
          return;
        }

        this.populateForm(result.data);
        this.transactionFound = true;

        // Set focus to received amount input after successful search
        setTimeout(() => {
          this.receivedAmountInput?.nativeElement.focus();
        }, 100);
      } else {
        this.toastService.showError('Not Found', result.message || 'Transaction not found');
        this.transactionFound = false;
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      this.toastService.showError('Error', 'Failed to search transaction');
      this.transactionFound = false;
    } finally {
      this.isLoading = false;
    }
  }

  private populateForm(data: any) {
    // Store transaction ID
    this.transactionId = data.id || 0; // Use data.id which is the transaction ID

    // Populate customer info
    this.customerInfo = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      middleName: '', // Not available in current API
      contactNumber: data.contactNumber || '',
      address: data.completeAddress || '',
      city: data.cityName || '',
      barangay: data.barangayName || ''
    };

    // Populate transaction info
    this.transactionInfo = {
      transactionNumber: data.ticketNumber || '',
      transactionDate: this.formatDate(data.transactionDate),
      grantedDate: this.formatDate(data.dateGranted),
      maturedDate: this.formatDate(data.dateMatured),
      expiredDate: this.formatDate(data.dateExpired),
      loanStatus: this.getStatusText(data.status),
      gracePeriodDate: data.gracePeriodDateStr || this.formatDate(data.gracePeriodDate),
      newMaturityDate: '',
      newExpiryDate: '',
      newGracePeriodDate: ''
    };

    // Populate items
    this.items = (data.items || []).map((item: any) => ({
      category: item.category || '',
      categoryDescription: item.categoryDescription || '',
      description: item.description || '',
      descriptionName: item.descriptionName || item.description || '',
      appraisalNotes: item.appraisalNotes || item.notes || '',
      appraisalValue: parseFloat(item.appraisalValue || 0)
    }));

    // Populate renew computation
    this.renewComputation = {
      principalLoan: data.principalAmount || 0,
      interestRate: data.interestRate || 3.5,
      discount: 0,
      interest: 0, // Will be calculated
      penalty: data.penaltyAmount || 0,
      dueAmount: 0, // Will be calculated
      newLoanAmount: 0,
      advanceInterest: 0, // Will be calculated
      advServiceCharge: 0, // Will be calculated
      serviceFee: 0, // Will be calculated
      totalRenewAmount: 0, // Will be calculated
      receivedAmount: 0,
      change: 0
    };

    // Calculate renewal amounts
    this.calculateRenewAmount();
  }

  private clearForm() {
    this.transactionId = 0;
    this.transactionFound = false;

    this.customerInfo = {
      firstName: '',
      lastName: '',
      middleName: '',
      contactNumber: '',
      address: '',
      city: '',
      barangay: ''
    };

    this.transactionInfo = {
      transactionNumber: '',
      transactionDate: '',
      grantedDate: '',
      maturedDate: '',
      expiredDate: '',
      loanStatus: ''
    };

    this.items = [];

    this.renewComputation = {
      principalLoan: 0,
      interestRate: 3.5,
      discount: 0,
      interest: 0,
      penalty: 0,
      dueAmount: 0,
      newLoanAmount: 0,
      advanceInterest: 0,
      advServiceCharge: 0,
      serviceFee: 0,
      totalRenewAmount: 0,
      receivedAmount: 0,
      change: 0
    };
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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

  async calculateRenewAmount() {
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

      console.log(`🎯 GRACE PERIOD CHECK (Renew):`, {
        maturityDate: maturityDate.toISOString().split('T')[0],
        currentDate: now.toISOString().split('T')[0],
        daysAfterMaturity,
        isWithinGracePeriod
      });
    }

    // Use PenaltyCalculatorService for interest and penalty calculation (DAILY interest)
    if (this.transactionInfo.grantedDate && this.transactionInfo.maturedDate) {
      const calculation = this.penaltyCalculatorService.calculateDailyInterestAndPenaltyWithGracePeriod(
        this.renewComputation.principalLoan,
        this.renewComputation.interestRate,
        new Date(this.transactionInfo.grantedDate),
        new Date(this.transactionInfo.maturedDate),
        new Date()
      );

      this.renewComputation.interest = calculation.interest;
      this.renewComputation.penalty = calculation.penalty;
      this.renewComputation.discount = calculation.discount;

      console.log(`💰 Interest & Penalty Calculation (Renew - DAILY):`, {
        isWithinGracePeriod: calculation.isWithinGracePeriod,
        daysAfterMaturity: calculation.daysAfterMaturity,
        interest: calculation.interest.toFixed(2),
        penalty: calculation.penalty.toFixed(2),
        discount: calculation.discount
      });
    } else {
      this.renewComputation.interest = 0;
      this.renewComputation.penalty = 0;
      this.renewComputation.discount = 0;
    }

    // Calculate due amount (interest + penalty that must be paid)
    this.renewComputation.dueAmount = this.renewComputation.interest + this.renewComputation.penalty;

    // Calculate advance interest for the new loan (next 30 days prepaid)
    const newLoanAmount = this.renewComputation.newLoanAmount > 0 ?
      this.renewComputation.newLoanAmount : this.renewComputation.principalLoan;

    const monthlyRate = this.renewComputation.interestRate / 100;
    this.renewComputation.advanceInterest = newLoanAmount * monthlyRate;

    // Calculate advance service charge based on new loan amount
    this.renewComputation.advServiceCharge = await this.calculateServiceCharge(newLoanAmount);

    // If new loan amount is specified, calculate service fee
    if (this.renewComputation.newLoanAmount > 0) {
      // Calculate service charge based on new loan amount
      this.renewComputation.serviceFee = this.renewComputation.advServiceCharge;
    } else {
      // If no new loan, just renew existing - service fee based on principal
      this.renewComputation.newLoanAmount = this.renewComputation.principalLoan;
      this.renewComputation.serviceFee = this.renewComputation.advServiceCharge;
    }

    // Calculate total renew amount customer must pay
    // Total = Due Amount (interest + penalty) + Advance Interest + Service Charge
    this.renewComputation.totalRenewAmount =
      this.renewComputation.dueAmount +
      this.renewComputation.advanceInterest +
      this.renewComputation.serviceFee;

    console.log(`💵 Renew total calculation:`, {
      dueAmount: this.renewComputation.dueAmount,
      advanceInterest: this.renewComputation.advanceInterest,
      serviceFee: this.renewComputation.serviceFee,
      total: this.renewComputation.totalRenewAmount
    });

    this.calculateChange();

    // Calculate new dates for the renewed loan
    this.calculateNewDates();
  }

  // Calculate new maturity and expiry dates for the renewed loan
  calculateNewDates() {
    // Use TransactionDateService for consistent date calculations
    const newDates = this.transactionDateService.calculateRenewDates(1); // 1 month extension

    this.transactionInfo.newMaturityDate = newDates.newMaturityDate;
    this.transactionInfo.newGracePeriodDate = newDates.newGracePeriodDate;
    this.transactionInfo.newExpiryDate = newDates.newExpiryDate;

    console.log('📅 Renew - New Dates Calculated:');
    console.log('  New Maturity:', this.transactionInfo.newMaturityDate);
    console.log('  New Grace Period:', this.transactionInfo.newGracePeriodDate);
    console.log('  New Expiry:', this.transactionInfo.newExpiryDate);
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
    if (this.renewComputation.penalty === 0) {
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
      const monthlyRate = this.renewComputation.interestRate;
      const dailyRate = monthlyRate / 30;

      return `Interest: ${monthlyRate}% monthly (${dailyRate.toFixed(4)}% daily) for ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
    }
    return 'Interest calculation based on days from grant date';
  }

  calculateChange() {
    // Set change to 0 if received amount is empty or 0
    if (!this.renewComputation.receivedAmount || this.renewComputation.receivedAmount === 0) {
      this.renewComputation.change = 0;
      return;
    }

    this.renewComputation.change = this.renewComputation.receivedAmount - this.renewComputation.totalRenewAmount;
  }

  getTotalAppraisalValue(): number {
    return this.items.reduce((total, item) => total + item.appraisalValue, 0);
  }

  getLoanStatusClass(): string {
    switch (this.transactionInfo.loanStatus?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'matured':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getYearsDifference(): number {
    if (!this.transactionInfo.transactionDate || !this.transactionInfo.expiredDate) return 0;
    const start = new Date(this.transactionInfo.transactionDate);
    const end = new Date(this.transactionInfo.expiredDate);
    return Math.floor((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  getMonthsDifference(): number {
    if (!this.transactionInfo.transactionDate || !this.transactionInfo.expiredDate) return 0;
    const start = new Date(this.transactionInfo.transactionDate);
    const end = new Date(this.transactionInfo.expiredDate);
    const years = this.getYearsDifference();
    const totalMonths = Math.floor((end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    return totalMonths - (years * 12);
  }

  getDaysDifference(): number {
    if (!this.transactionInfo.transactionDate || !this.transactionInfo.expiredDate) return 0;
    const start = new Date(this.transactionInfo.transactionDate);
    const end = new Date(this.transactionInfo.expiredDate);
    const years = this.getYearsDifference();
    const months = this.getMonthsDifference();
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return totalDays - (years * 365) - (months * 30);
  }

  canProcessRenew(): boolean {
    return this.transactionFound &&
           this.renewComputation.totalRenewAmount > 0 &&
           this.renewComputation.receivedAmount >= this.renewComputation.totalRenewAmount &&
           this.items.length > 0;
  }

  async processRenew() {
    if (!this.canProcessRenew()) {
      this.toastService.showError('Error', 'Invalid renewal amount or insufficient payment');
      return;
    }

    if (!this.transactionId) {
      this.toastService.showError('Error', 'Transaction ID not found');
      return;
    }

    this.isLoading = true;

    try {
      const renewData = {
        ticketId: this.transactionId,
        renewalFee: this.renewComputation.totalRenewAmount,
        newInterestRate: this.renewComputation.interestRate,
        newMaturityDate: this.transactionInfo.newMaturityDate,
        newExpiryDate: this.transactionInfo.newExpiryDate,
        notes: `Renewal - Change: ₱${this.renewComputation.change.toFixed(2)}`
      };

      const response = await fetch('http://localhost:3000/api/transactions/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(renewData)
      });

      const result = await response.json();

      if (result.success) {
        // Prepare invoice data
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Calculate new maturity and expiry dates (30 days and 60 days from now)
        const newMaturityDate = new Date();
        newMaturityDate.setDate(newMaturityDate.getDate() + 30);
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + 60);

        this.invoiceData = {
          transactionType: 'renewal',
          transactionNumber: result.data?.transactionId || this.transactionInfo.transactionNumber,
          ticketNumber: this.searchTicketNumber,
          transactionDate: new Date(),
          pawnerName: `${this.customerInfo.firstName} ${this.customerInfo.lastName}`,
          pawnerContact: this.customerInfo.contactNumber,
          pawnerAddress: this.customerInfo.address || 'N/A',
          items: this.items.map(item => ({
            category: item.category || 'N/A',
            description: item.description || 'N/A',
            appraisedValue: item.appraisalValue || 0
          })),
          principalAmount: this.renewComputation.principalLoan,
          interestRate: this.renewComputation.interestRate,
          interestAmount: this.renewComputation.interest,
          serviceCharge: this.renewComputation.serviceFee,
          paymentAmount: this.renewComputation.receivedAmount,
          totalAmount: this.renewComputation.totalRenewAmount,
          previousBalance: this.renewComputation.dueAmount,
          remainingBalance: -this.renewComputation.change,
          loanDate: new Date(),
          maturityDate: newMaturityDate,
          expiryDate: newExpiryDate,
          branchName: user.branch_name || 'Main Branch',
          cashierName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          notes: `Renewal - New Loan Amount: ₱${this.renewComputation.newLoanAmount.toFixed(2)}`
        };

        // Show invoice modal
        this.showInvoiceModal = true;
      } else {
        this.toastService.showError('Error', result.message || 'Failed to process renewal');
      }
    } catch (error) {
      console.error('Error processing renewal:', error);
      this.toastService.showError('Error', 'Failed to process renewal');
    } finally {
      this.isLoading = false;
    }
  }

  resetForm() {
    this.searchTicketNumber = '';
    this.searchQuery = '';
    this.clearForm();
    this.toastService.showInfo('Reset', 'Form has been reset');
  }

  goBack() {
    this.location.back();
  }

  processRenewal() {
    // Alias for processRenew for backward compatibility
    this.processRenew();
  }

  // Close invoice modal and navigate back
  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceData = null;
    this.router.navigate(['/cashier-dashboard']);
  }
}
