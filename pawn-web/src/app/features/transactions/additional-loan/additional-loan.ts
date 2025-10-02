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
  imports: [CommonModule, FormsModule],
  templateUrl: './additional-loan.html',
  styleUrl: './additional-loan.css'
})
export class AdditionalLoan implements OnInit {

  transactionNumber: string = '1';

  customerInfo: CustomerInfo = {
    contactNumber: '111111111',
    firstName: 'romel',
    lastName: 'pacs',
    city: 'Iloilo',
    barangay: 'Monay',
    completeAddress: 'san pedro'
  };

  transactionInfo: TransactionInfo = {
    transactionDate: '2025-10-02',
    grantedDate: '2025-10-02',
    maturedDate: '2025-11-02',
    expiredDate: '2026-02-02',
    loanStatus: 'Active'
  };

  items: PawnedItem[] = [
    {
      category: 'Appliances',
      categoryDescription: '50" Television',
      itemsDescription: '50" Television',
      appraisalValue: 10000.00
    }
  ];

  additionalComputation: AdditionalComputation = {
    appraisalValue: 10000.00,
    availableAmount: 5000.00,
    discount: 0,
    previousLoan: 5000.00,
    interest: 0,
    penalty: 100.00,
    additionalAmount: 0,
    newPrincipalLoan: 5000.00,
    interestRate: 6,
    advanceInterest: 0,
    advServiceCharge: 0,
    netProceed: 100.00,
    redeemAmount: 5100.00
  };

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.calculateAdditionalLoan();
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

  canProcessAdditionalLoan(): boolean {
    return this.additionalComputation.additionalAmount > 0;
  }

  resetForm() {
    this.additionalComputation = {
      appraisalValue: this.getTotalAppraisalValue(),
      availableAmount: 5000.00,
      discount: 0,
      previousLoan: 5000.00,
      interest: 0,
      penalty: 100.00,
      additionalAmount: 0,
      newPrincipalLoan: 5000.00,
      interestRate: 6,
      advanceInterest: 0,
      advServiceCharge: 0,
      netProceed: 0,
      redeemAmount: 0
    };
    this.calculateAdditionalLoan();
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
