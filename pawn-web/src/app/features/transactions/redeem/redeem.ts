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
  transactionNumber: string = '1';
  
  customerInfo: CustomerInfo = {
    contactNumber: '111111111',
    firstName: 'romel',
    lastName: 'pacs',
    city: 'iloilo',
    barangay: 'Monay',
    completeAddress: 'san pedro'
  };
  
  transactionInfo: TransactionInfo = {
    transactionDate: '2025-09-29',
    grantedDate: '2025-09-29',
    maturedDate: '2025-10-29',
    expiredDate: '2026-01-29',
    loanStatus: 'Premature'
  };
  
  items: PawnedItem[] = [
    {
      category: 'Appliances',
      categoryDescription: '50" Television',
      itemsDescription: '',
      appraisalValue: 10000.00
    }
  ];
  
  redeemComputation: RedeemComputation = {
    principalLoan: 5000.00,
    interestRate: 6,
    interest: 0.00,
    penalty: 100.00,
    dueAmount: 100.00,
    discount: 0.00,
    redeemAmount: 5100.00,
    receivedAmount: 0.00,
    change: 5100.00
  };

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Calculate initial redeem amount
    this.calculateRedeemAmount();
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
    return this.redeemComputation.receivedAmount >= this.redeemComputation.redeemAmount &&
           this.items.length > 0;
  }

  searchTransaction() {
    // TODO: Implement transaction search functionality
    this.toastService.showInfo('Info', 'Transaction search functionality will be implemented');
  }

  resetForm() {
    this.redeemComputation.discount = 0;
    this.redeemComputation.receivedAmount = 0;
    this.calculateRedeemAmount();
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
