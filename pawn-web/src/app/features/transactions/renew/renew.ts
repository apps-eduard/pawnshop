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

  searchQuery: string = '';

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Initialize component
  }

  searchTransaction() {
    if (!this.searchQuery.trim()) {
      this.toastService.showError('Error', 'Please enter a transaction number');
      return;
    }

    // Mock search implementation
    this.customerInfo = {
      firstName: 'Sample',
      lastName: 'Customer',
      middleName: 'M',
      contactNumber: '+63 912 345 6789',
      address: '123 Sample Street',
      city: 'Sample City',
      barangay: 'Sample Barangay'
    };

    this.transactionInfo = {
      transactionNumber: this.searchQuery,
      transactionDate: '2024-01-15',
      grantedDate: '2024-01-15',
      maturedDate: '2024-02-15',
      expiredDate: '2024-03-15',
      loanStatus: 'Active'
    };

    this.items = [
      {
        category: 'Jewelry',
        categoryDescription: 'Gold Ring',
        itemsDescription: '18K Gold Ring with Diamond',
        appraisalValue: 25000
      }
    ];

    this.renewComputation.principalLoan = 20000;
    this.calculateRenewAmount();
    this.toastService.showSuccess('Success', 'Transaction found');
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
    return this.renewComputation.totalRenewAmount > 0 && 
           this.renewComputation.receivedAmount >= this.renewComputation.totalRenewAmount;
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
    this.searchQuery = '';
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

  goBack() {
    this.location.back();
  }

  processRenewal() {
    // Alias for processRenew for backward compatibility
    this.processRenew();
  }
}
