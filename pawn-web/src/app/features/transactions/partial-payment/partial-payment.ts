import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

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
  expiredDate: string;
  loanStatus: string;
}

interface PawnedItem {
  id: number;
  category: string;
  categoryDescription: string;
  itemsDescription: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './partial-payment.html',
  styleUrl: './partial-payment.css'
})
export class PartialPayment implements OnInit {

  searchTicketNumber: string = '';
  transactionNumber: string = '';
  isLoading: boolean = false;
  transactionFound: boolean = false;

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
    loanStatus: ''
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

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Partial Payment page loaded - form cleared');
  }

  getTotalAppraisalValue(): number {
    return this.pawnedItems.reduce((total, item) => total + item.appraisalValue, 0);
  }

  calculatePartialPayment() {
    // Update appraisal value from items
    this.partialComputation.appraisalValue = this.getTotalAppraisalValue();
    
    // Calculate interest (example calculation)
    this.partialComputation.interest = (this.partialComputation.principalLoan * this.partialComputation.interestRate) / 100;
    
    // Calculate redeem amount
    this.partialComputation.redeemAmount = 
      this.partialComputation.principalLoan + 
      this.partialComputation.interest + 
      this.partialComputation.penalty - 
      this.partialComputation.discount;

    // Calculate net payment
    this.partialComputation.netPayment = 
      this.partialComputation.partialPay + 
      this.partialComputation.advanceInterest + 
      this.partialComputation.advServiceCharge;

    // Calculate new principal loan
    this.partialComputation.newPrincipalLoan = 
      this.partialComputation.principalLoan - this.partialComputation.partialPay;

    this.calculateChange();
  }

  calculateChange() {
    this.partialComputation.change = 
      this.partialComputation.amountReceived - this.partialComputation.netPayment;
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
      expiredDate: this.formatDate(data.dateExpired),
      loanStatus: this.getStatusText(data.status)
    };

    // Populate items
    this.pawnedItems = (data.items || []).map((item: any, index: number) => ({
      id: index + 1,
      category: item.category || '',
      categoryDescription: item.categoryDescription || '',
      itemsDescription: item.description || item.itemsDescription || '',
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
    this.calculatePartialPayment();
  }

  private clearForm() {
    this.transactionNumber = '';
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
      loanStatus: ''
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

  processPayment() {
    if (!this.canProcessPayment()) {
      this.toastService.showError('Error', 'Amount received is insufficient');
      return;
    }

    // TODO: Implement actual partial payment processing
    this.toastService.showSuccess('Success', 'Partial payment processed successfully');
    this.goBack();
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
}
