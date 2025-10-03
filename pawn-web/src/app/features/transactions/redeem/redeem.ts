import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './redeem.html',
  styleUrl: './redeem.css'
})
export class Redeem implements OnInit {
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
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Redeem page loaded - form cleared');
  }

  getTotalAppraisalValue(): number {
    return this.items.reduce((total, item) => total + item.appraisalValue, 0);
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

  calculateRedeemAmount() {
    // Calculate interest based on days
    const days = this.getDaysDifference();
    const monthlyRate = this.redeemComputation.interestRate / 100;
    const dailyRate = monthlyRate / 30;
    this.redeemComputation.interest = this.redeemComputation.principalLoan * dailyRate * days;
    
    // Calculate due amount
    this.redeemComputation.dueAmount = 
      this.redeemComputation.principalLoan + 
      this.redeemComputation.interest + 
      this.redeemComputation.penalty;
    
    // Calculate redeem amount with discount
    this.redeemComputation.redeemAmount = 
      this.redeemComputation.dueAmount - this.redeemComputation.discount;
    
    // Calculate change if received amount is set
    this.calculateChange();
  }

  calculateChange() {
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

  processRedeem() {
    if (!this.canProcessRedeem()) {
      this.toastService.showError('Error', 'Please ensure all requirements are met');
      return;
    }
    
    // TODO: Implement actual redeem processing
    this.toastService.showSuccess('Success', `Item redeemed successfully! Change: ₱${this.redeemComputation.change.toFixed(2)}`);
    // this.goBack();
  }

  goBack() {
    this.location.back();
  }
}
