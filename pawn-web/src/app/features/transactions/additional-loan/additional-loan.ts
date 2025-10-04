import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent } from '../../../shared/components/transaction/transaction-info.component';

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
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Additional Loan page loaded - form cleared');
  }

  getTotalAppraisalValue(): number {
    return this.items.reduce((total, item) => total + item.appraisalValue, 0);
  }

  calculateAdditionalLoan() {
    // Update appraisal value from items
    this.additionalComputation.appraisalValue = this.getTotalAppraisalValue();

    // Calculate available amount (example: 50% of appraisal value minus previous loan)
    this.additionalComputation.availableAmount =
      (this.additionalComputation.appraisalValue * 0.5) - this.additionalComputation.previousLoan;

    // Calculate additional amount after discount
    this.additionalComputation.additionalAmount =
      this.additionalComputation.availableAmount - this.additionalComputation.discount;

    // Calculate new principal loan
    this.additionalComputation.newPrincipalLoan =
      this.additionalComputation.previousLoan + this.additionalComputation.additionalAmount;

    // Calculate advance interest (example calculation)
    this.additionalComputation.advanceInterest =
      (this.additionalComputation.newPrincipalLoan * this.additionalComputation.interestRate) / 100;

    // Calculate net proceed
    this.additionalComputation.netProceed =
      this.additionalComputation.additionalAmount -
      this.additionalComputation.advanceInterest -
      this.additionalComputation.advServiceCharge;

    // Calculate redeem amount
    this.additionalComputation.redeemAmount =
      this.additionalComputation.newPrincipalLoan +
      this.additionalComputation.interest +
      this.additionalComputation.penalty;
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
    // Set transaction number
    this.transactionNumber = data.ticketNumber;

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

  processAdditionalLoan() {
    if (!this.canProcessAdditionalLoan()) {
      this.toastService.showError('Error', 'Cannot process additional loan');
      return;
    }

    // TODO: Implement actual additional loan processing
    this.toastService.showSuccess('Success', 'Additional loan processed successfully');
    this.goBack();
  }

  createAdditionalLoan() {
    // TODO: Implement additional loan logic
    this.toastService.showSuccess('Success', 'Additional loan created successfully');
    this.goBack();
  }
}
