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

  transactionNumber: string = '1';

  customerInfo: CustomerInfo = {
    contactNumber: '111111111',
    firstName: 'romel',
    lastName: 'pacs',
    transactionDate: '9/29/2025',
    grantedDate: '9/29/2025',
    city: 'Iloilo',
    barangay: 'Monay',
    maturedDate: '10/29/2025',
    expiredDate: '1/29/2026',
    completeAddress: 'san pedro'
  };

  transactionInfo: TransactionInfo = {
    transactionDate: '2025-10-02',
    grantedDate: '2025-10-02',
    maturedDate: '2025-11-02',
    expiredDate: '2026-02-02',
    loanStatus: 'Active'
  };

  pawnedItems: PawnedItem[] = [
    {
      id: 1,
      category: 'Appliances',
      categoryDescription: '50" Television',
      itemsDescription: '50" Television',
      appraisalValue: 10000.00
    }
  ];

  partialComputation: PartialComputation = {
    appraisalValue: 10000.00,
    discount: 0,
    principalLoan: 5000.00,
    interestRate: 5,
    interest: 0,
    penalty: 100.00,
    partialPay: 0,
    newPrincipalLoan: 5000.00,
    advanceInterest: 300.00,
    advServiceCharge: 5.00,
    redeemAmount: 5100.00,
    netPayment: 305.00,
    amountReceived: 0,
    change: 0
  };

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.calculatePartialPayment();
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
    return this.partialComputation.amountReceived >= this.partialComputation.netPayment;
  }

  resetForm() {
    this.partialComputation = {
      appraisalValue: this.getTotalAppraisalValue(),
      discount: 0,
      principalLoan: 5000.00,
      interestRate: 5,
      interest: 0,
      penalty: 100.00,
      partialPay: 0,
      newPrincipalLoan: 5000.00,
      advanceInterest: 300.00,
      advServiceCharge: 5.00,
      redeemAmount: 0,
      netPayment: 0,
      amountReceived: 0,
      change: 0
    };
    this.calculatePartialPayment();
  }

  searchTransaction() {
    // TODO: Implement transaction search functionality
    this.toastService.showInfo('Info', 'Search transaction feature will be implemented');
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
