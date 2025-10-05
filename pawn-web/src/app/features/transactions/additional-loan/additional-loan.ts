import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';

// Interfaces
interface CustomerInfo {
  contactNumber: string;
  firstName: string;
  lastName: string;
  city: string;
  barangay: string;
  completeAddress: string;
}

interface TransactionInfo {
  transactionDate: string;
  grantedDate: string;
  maturedDate: string;
  expiredDate: string;
  loanStatus: string;
}

interface PawnedItem {
  category: string;
  categoryDescription: string;
  itemsDescription: string;
  appraisalValue: number;
}

interface AdditionalComputation {
  appraisalValue: number;
  availableAmount: number;
  discount: number;
  previousLoan: number;
  interest: number;
  penalty: number;
  additionalAmount: number;
  newPrincipalLoan: number;
  interestRate: number;
  advanceInterest: number;
  advServiceCharge: number;
  netProceed: number;
  redeemAmount: number;
}

@Component({
  selector: 'app-additional-loan',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionInfoComponent],
  templateUrl: './additional-loan.html',
  styleUrl: './additional-loan.css'
})
export class AdditionalLoan implements OnInit {

  searchTicketNumber: string = '';
  transactionNumber: string = '';
  transactionId: number = 0;
  isLoading: boolean = false;
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
    expiredDate: '',
    loanStatus: ''
  };

  items: PawnedItem[] = [];

  additionalComputation: AdditionalComputation = {
    appraisalValue: 0,
    availableAmount: 0,
    discount: 0,
    previousLoan: 0,
    interest: 0,
    penalty: 0,
    additionalAmount: 0,
    newPrincipalLoan: 0,
    interestRate: 6,
    advanceInterest: 0,
    advServiceCharge: 0,
    netProceed: 0,
    redeemAmount: 0
  };

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Additional Loan page loaded - form cleared');
  }

  getTotalAppraisalValue(): number {
    return this.items.reduce((total, item) => total + item.appraisalValue, 0);
  }

  // Handle manual additional amount input
  async onAdditionalAmountChange() {
    console.log('🔢 Additional amount changed:', this.additionalComputation.additionalAmount);
    console.log('📊 Available amount:', this.additionalComputation.availableAmount);

    // Convert to number if it's a string
    this.additionalComputation.additionalAmount = Number(this.additionalComputation.additionalAmount) || 0;

    // Ensure additional amount doesn't exceed available amount
    if (this.additionalComputation.additionalAmount > this.additionalComputation.availableAmount) {
      console.warn('⚠️ Additional amount exceeds available amount, capping it');
      this.additionalComputation.additionalAmount = this.additionalComputation.availableAmount;
    }

    // Ensure it's not negative
    if (this.additionalComputation.additionalAmount < 0) {
      console.warn('⚠️ Additional amount is negative, setting to 0');
      this.additionalComputation.additionalAmount = 0;
    }

    console.log('✅ Final additional amount:', this.additionalComputation.additionalAmount);

    // Recalculate dependent values
    await this.recalculateDependentValues();
  }

  // Recalculate values that depend on additional amount
  async recalculateDependentValues() {
    console.log('🔄 Recalculating dependent values...');
    console.log('  Previous Loan:', this.additionalComputation.previousLoan);
    console.log('  Additional Amount:', this.additionalComputation.additionalAmount);

    // Calculate new principal loan
    this.additionalComputation.newPrincipalLoan =
      this.additionalComputation.previousLoan + this.additionalComputation.additionalAmount;

    console.log('  New Principal Loan:', this.additionalComputation.newPrincipalLoan);

    // Calculate advance interest (1 month interest on new principal)
    this.additionalComputation.advanceInterest =
      (this.additionalComputation.newPrincipalLoan * this.additionalComputation.interestRate) / 100;

    console.log('  Advance Interest:', this.additionalComputation.advanceInterest);

    // Calculate advance service charge dynamically (WAIT for this to complete)
    await this.calculateServiceCharge();

    console.log('  Service Charge:', this.additionalComputation.advServiceCharge);

    // Calculate net proceed (now service charge is ready)
    this.additionalComputation.netProceed =
      this.additionalComputation.additionalAmount -
      this.additionalComputation.advanceInterest -
      this.additionalComputation.advServiceCharge -
      this.additionalComputation.interest -
      this.additionalComputation.penalty;

    console.log('  Net Proceed:', this.additionalComputation.netProceed);

    // Calculate redeem amount (new principal + advance interest + service charge)
    this.additionalComputation.redeemAmount =
      this.additionalComputation.newPrincipalLoan +
      this.additionalComputation.advanceInterest +
      this.additionalComputation.advServiceCharge;

    console.log('  Redeem Amount:', this.additionalComputation.redeemAmount);
    console.log('✅ Recalculation complete!');
  }

  async calculateAdditionalLoan() {
    console.log('Calculating additional loan...');

    // Update appraisal value from items
    this.additionalComputation.appraisalValue = this.getTotalAppraisalValue();

    // Calculate interest on existing loan (from grant date to now)
    if (this.transactionInfo.grantedDate) {
      const loanDate = new Date(this.transactionInfo.grantedDate);
      const currentDate = new Date();
      const loanPeriodDays = Math.ceil((currentDate.getTime() - loanDate.getTime()) / (1000 * 3600 * 24));
      const monthlyRate = this.additionalComputation.interestRate / 100;
      const dailyRate = monthlyRate / 30;
      this.additionalComputation.interest = this.additionalComputation.previousLoan * dailyRate * loanPeriodDays;
    }

    // Calculate penalty using PenaltyCalculatorService
    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const currentDate = new Date();
      const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
        this.additionalComputation.previousLoan,
        maturityDate,
        currentDate
      );
      this.additionalComputation.penalty = penaltyDetails.penaltyAmount;
    }

    // Calculate available amount (50% of appraisal value minus previous loan, interest, and penalty)
    const totalObligation = this.additionalComputation.previousLoan +
                           this.additionalComputation.interest +
                           this.additionalComputation.penalty;
    this.additionalComputation.availableAmount =
      (this.additionalComputation.appraisalValue * 0.5) - totalObligation;

    // Keep additionalAmount at 0 or user-entered value (don't auto-calculate)
    // User will manually enter the additional amount they want
    if (!this.additionalComputation.additionalAmount) {
      this.additionalComputation.additionalAmount = 0;
    }

    // Recalculate dependent values based on current additional amount
    await this.recalculateDependentValues();

    console.log('Calculation result:', {
      interest: this.additionalComputation.interest,
      penalty: this.additionalComputation.penalty,
      availableAmount: this.additionalComputation.availableAmount,
      additionalAmount: this.additionalComputation.additionalAmount,
      newPrincipal: this.additionalComputation.newPrincipalLoan,
      advanceInterest: this.additionalComputation.advanceInterest,
      serviceCharge: this.additionalComputation.advServiceCharge,
      netProceed: this.additionalComputation.netProceed,
      redeemAmount: this.additionalComputation.redeemAmount
    });
  }

  async calculateServiceCharge() {
    try {
      const response = await fetch('http://localhost:3000/api/service-charge-config/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          principalAmount: this.additionalComputation.newPrincipalLoan
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        this.additionalComputation.advServiceCharge = result.data.serviceCharge || 0;
        console.log('Service charge calculated:', this.additionalComputation.advServiceCharge);
      } else {
        // Fallback calculation if API fails
        this.additionalComputation.advServiceCharge = this.calculateFallbackServiceCharge();
      }
    } catch (error) {
      console.error('Error calculating service charge:', error);
      // Fallback calculation
      this.additionalComputation.advServiceCharge = this.calculateFallbackServiceCharge();
    }
  }

  private calculateFallbackServiceCharge(): number {
    const principal = this.additionalComputation.newPrincipalLoan;
    if (principal <= 500) return 10;
    if (principal <= 1000) return 15;
    if (principal <= 5000) return 20;
    if (principal <= 10000) return 30;
    if (principal <= 20000) return 40;
    return 50;
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
    // Set transaction number and ID
    this.transactionNumber = data.ticketNumber || data.transactionNumber;
    this.transactionId = data.id || 0;

    // Populate customer info
    this.customerInfo = {
      contactNumber: data.contactNumber || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      city: data.cityName || '',
      barangay: data.barangayName || '',
      completeAddress: data.completeAddress || ''
    };

    // Populate transaction info
    this.transactionInfo = {
      transactionDate: this.formatDate(data.transactionDate),
      grantedDate: this.formatDate(data.dateGranted),
      maturedDate: this.formatDate(data.dateMatured),
      expiredDate: this.formatDate(data.dateExpired),
      loanStatus: this.getStatusText(data.status)
    };

    // Populate items
    this.items = data.items || [];

    // Populate additional computation
    this.additionalComputation = {
      appraisalValue: this.getTotalAppraisalValue(),
      availableAmount: 0, // Will be calculated
      discount: 0,
      previousLoan: data.principalAmount || 0,
      interest: data.interestAmount || 0,
      penalty: data.penaltyAmount || 0,
      additionalAmount: 0, // Will be calculated
      newPrincipalLoan: 0, // Will be calculated
      interestRate: data.interestRate || 6,
      advanceInterest: 0, // Will be calculated
      advServiceCharge: 0,
      netProceed: 0, // Will be calculated
      redeemAmount: 0 // Will be calculated
    };

    // Calculate additional loan amounts
    this.calculateAdditionalLoan();
  }

  private clearForm() {
    this.transactionNumber = '';
    this.transactionId = 0;
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
      expiredDate: '',
      loanStatus: ''
    };

    this.items = [];

    this.additionalComputation = {
      appraisalValue: 0,
      availableAmount: 0,
      discount: 0,
      previousLoan: 0,
      interest: 0,
      penalty: 0,
      additionalAmount: 0,
      newPrincipalLoan: 0,
      interestRate: 6,
      advanceInterest: 0,
      advServiceCharge: 0,
      netProceed: 0,
      redeemAmount: 0
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

  canProcessAdditionalLoan(): boolean {
    return this.transactionFound &&
           this.additionalComputation.additionalAmount > 0 &&
           this.items.length > 0;
  }

  resetForm() {
    this.searchTicketNumber = '';
    this.clearForm();
    this.toastService.showInfo('Reset', 'Form has been reset');
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

  goBack() {
    this.location.back();
  }

  async processAdditionalLoan() {
    if (!this.canProcessAdditionalLoan()) {
      this.toastService.showError('Error', 'Cannot process additional loan');
      return;
    }

    if (!this.transactionId) {
      this.toastService.showError('Error', 'Transaction ID is required');
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('http://localhost:3000/api/transactions/additional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transactionId: this.transactionId,
          transactionNumber: this.transactionNumber,
          additionalAmount: this.additionalComputation.additionalAmount,
          interest: this.additionalComputation.interest,
          penalty: this.additionalComputation.penalty,
          newPrincipalLoan: this.additionalComputation.newPrincipalLoan,
          advanceInterest: this.additionalComputation.advanceInterest,
          serviceCharge: this.additionalComputation.advServiceCharge,
          netProceed: this.additionalComputation.netProceed,
          discount: this.additionalComputation.discount
        })
      });

      const result = await response.json();

      if (result.success) {
        this.toastService.showSuccess('Success', `Additional loan processed successfully! Net Proceed: ₱${this.additionalComputation.netProceed.toFixed(2)}`);
        // Redirect to dashboard after successful processing
        setTimeout(() => {
          this.router.navigate(['/cashier-dashboard']);
        }, 1500);
      } else {
        this.toastService.showError('Error', result.message || 'Failed to process additional loan');
      }
    } catch (error) {
      console.error('Error processing additional loan:', error);
      this.toastService.showError('Error', 'Failed to process additional loan');
    } finally {
      this.isLoading = false;
    }
  }

  createAdditionalLoan() {
    // TODO: Implement additional loan logic
    this.toastService.showSuccess('Success', 'Additional loan created successfully');
    this.goBack();
  }
}
