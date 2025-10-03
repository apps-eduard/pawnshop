import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

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
  expiredDate: string;
  loanStatus: string;
}

interface PawnedItem {
  category: string;
  categoryDescription: string;
  itemsDescription: string;
  appraisalValue: number;
}

interface RenewComputation {
  principalLoan: number;
  interestRate: number;
  interest: number;
  penalty: number;
  dueAmount: number;
  newLoanAmount: number;
  serviceFee: number;
  totalRenewAmount: number;
  receivedAmount: number;
  change: number;
}

@Component({
  selector: 'app-renew',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renew.html',
  styleUrl: './renew.css'
})
export class Renew implements OnInit {

  searchTicketNumber: string = '';
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
    loanStatus: ''
  };

  items: PawnedItem[] = [];

  renewComputation: RenewComputation = {
    principalLoan: 0,
    interestRate: 3.5,
    interest: 0,
    penalty: 0,
    dueAmount: 0,
    newLoanAmount: 0,
    serviceFee: 0,
    totalRenewAmount: 0,
    receivedAmount: 0,
    change: 0
  };

  searchQuery: string = ''; // Keep for backward compatibility

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Renew page loaded - form cleared');
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
      loanStatus: this.getStatusText(data.status)
    };

    // Populate items
    this.items = (data.items || []).map((item: any) => ({
      category: item.category || '',
      categoryDescription: item.categoryDescription || '',
      itemsDescription: item.description || item.itemsDescription || '',
      appraisalValue: parseFloat(item.appraisalValue || 0)
    }));

    // Populate renew computation
    this.renewComputation = {
      principalLoan: data.principalAmount || 0,
      interestRate: data.interestRate || 3.5,
      interest: 0, // Will be calculated
      penalty: data.penaltyAmount || 0,
      dueAmount: 0, // Will be calculated
      newLoanAmount: 0,
      serviceFee: 0, // Will be calculated
      totalRenewAmount: 0, // Will be calculated
      receivedAmount: 0,
      change: 0
    };

    // Calculate renewal amounts
    this.calculateRenewAmount();
  }

  private clearForm() {
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
      interest: 0,
      penalty: 0,
      dueAmount: 0,
      newLoanAmount: 0,
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

  calculateRenewAmount() {
    // Calculate interest (example: 1 month at 3.5%)
    this.renewComputation.interest = this.renewComputation.principalLoan * (this.renewComputation.interestRate / 100);
    
    // Calculate penalty if applicable
    this.renewComputation.penalty = 500; // Example penalty
    
    // Calculate due amount
    this.renewComputation.dueAmount = this.renewComputation.principalLoan + this.renewComputation.interest + this.renewComputation.penalty;
    
    // Calculate service fee (example: 2% of new loan)
    this.renewComputation.serviceFee = this.renewComputation.newLoanAmount * 0.02;
    
    // Total renew amount = due amount + service fee - new loan
    this.renewComputation.totalRenewAmount = this.renewComputation.dueAmount + this.renewComputation.serviceFee - this.renewComputation.newLoanAmount;
    
    this.calculateChange();
  }

  calculateChange() {
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

  processRenew() {
    if (!this.canProcessRenew()) {
      this.toastService.showError('Error', 'Invalid renewal amount or insufficient payment');
      return;
    }

    // TODO: Implement actual renewal logic
    this.toastService.showSuccess('Success', 'Loan renewed successfully');
    this.goBack();
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
}
