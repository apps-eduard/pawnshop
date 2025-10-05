import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent, CustomerInfo, TransactionInfo, PawnedItem } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';

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
  imports: [CommonModule, FormsModule, TransactionInfoComponent],
  templateUrl: './redeem.html',
  styleUrl: './redeem.css'
})
export class Redeem implements OnInit {
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

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService
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

  getLoanStatusClass(): string {
    const status = this.getLoanStatus().toLowerCase();
    switch (status) {
      case 'premature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'matured':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  getDurationBadgeColors(): {years: string, months: string, days: string} {
    const status = this.getLoanStatus().toLowerCase();
    switch (status) {
      case 'premature':
        return {
          years: 'from-blue-500 to-blue-600',
          months: 'from-indigo-500 to-indigo-600',
          days: 'from-cyan-500 to-cyan-600'
        };
      case 'matured':
        return {
          years: 'from-yellow-500 to-yellow-600',
          months: 'from-orange-500 to-orange-600',
          days: 'from-amber-500 to-amber-600'
        };
      case 'expired':
        return {
          years: 'from-red-500 to-red-600',
          months: 'from-rose-500 to-rose-600',
          days: 'from-pink-500 to-pink-600'
        };
      default:
        return {
          years: 'from-gray-500 to-gray-600',
          months: 'from-slate-500 to-slate-600',
          days: 'from-zinc-500 to-zinc-600'
        };
    }
  }

  getDurationAnimationClass(): string {
    const status = this.getLoanStatus().toLowerCase();
    return status === 'expired' ? 'animate-pulse' : '';
  }

  getYearsDifference(): number {
    if (!this.transactionInfo.transactionDate) return 0;
    const transactionDate = new Date(this.transactionInfo.transactionDate);
    const now = new Date();
    const diffTime = now.getTime() - transactionDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  }

  getMonthsDifference(): number {
    if (!this.transactionInfo.transactionDate) return 0;
    const transactionDate = new Date(this.transactionInfo.transactionDate);
    const now = new Date();

    const years = this.getYearsDifference();
    const totalMonths = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return totalMonths - (years * 12);
  }

  getDaysDifference(): number {
    if (!this.transactionInfo.transactionDate) return 0;
    const transactionDate = new Date(this.transactionInfo.transactionDate);
    const now = new Date();

    const years = this.getYearsDifference();
    const months = this.getMonthsDifference();
    const totalDays = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
    return totalDays - (years * 365) - (months * 30);
  }

  getLoanStatus(): string {
    if (!this.transactionInfo.maturedDate || !this.transactionInfo.expiredDate) {
      return 'Unknown';
    }

    const now = new Date();
    const maturedDate = new Date(this.transactionInfo.maturedDate);
    const expiredDate = new Date(this.transactionInfo.expiredDate);

    // Clear time components for accurate date comparison
    now.setHours(0, 0, 0, 0);
    maturedDate.setHours(0, 0, 0, 0);
    expiredDate.setHours(0, 0, 0, 0);

    if (now > expiredDate) {
      return 'Expired';
    } else if (now > maturedDate) {
      return 'Matured';
    } else {
      return 'Premature';
    }
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
    const loanDate = this.transactionInfo.grantedDate
      ? new Date(this.transactionInfo.grantedDate)
      : new Date(this.transactionInfo.transactionDate);

    const maturityDate = new Date(this.transactionInfo.maturedDate);
    const currentDate = new Date();

    // Calculate interest based on the loan period (from loan date to current date)
    const loanPeriodDays = Math.ceil((currentDate.getTime() - loanDate.getTime()) / (1000 * 3600 * 24));
    const monthlyRate = this.redeemComputation.interestRate / 100;
    const dailyRate = monthlyRate / 30;
    this.redeemComputation.interest = this.redeemComputation.principalLoan * dailyRate * loanPeriodDays;

    console.log('Interest calculation:', {
      loanPeriodDays,
      monthlyRate,
      dailyRate,
      calculatedInterest: this.redeemComputation.interest
    });

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
  }  calculateChange() {
    this.redeemComputation.change =
      this.redeemComputation.receivedAmount - this.redeemComputation.redeemAmount;
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
        this.toastService.showSuccess('Success', 'Transaction found and loaded!');
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
    this.transactionInfo = {
      transactionDate: this.formatDate(data.transactionDate),
      grantedDate: this.formatDate(data.dateGranted || data.loanDate),
      maturedDate: this.formatDate(data.dateMatured || data.maturityDate),
      expiredDate: this.formatDate(data.dateExpired || data.expiryDate)
    };

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
    this.redeemComputation = {
      principalLoan: data.principalAmount || 0,
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
        this.toastService.showSuccess('Success', `Item redeemed successfully! Change: ₱${this.redeemComputation.change.toFixed(2)}`);
        // Redirect to dashboard after successful redemption
        setTimeout(() => {
          this.router.navigate(['/cashier-dashboard']);
        }, 1500);
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

  goBack() {
    this.location.back();
  }
}
