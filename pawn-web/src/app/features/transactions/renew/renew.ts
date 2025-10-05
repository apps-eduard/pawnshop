import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';

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
  description: string;
  descriptionName: string;
  appraisalNotes: string;
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
  imports: [CommonModule, FormsModule, TransactionInfoComponent],
  templateUrl: './renew.html',
  styleUrl: './renew.css'
})
export class Renew implements OnInit {

  searchTicketNumber: string = '';
  transactionId: number = 0;
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
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService
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
    // Store transaction ID
    this.transactionId = data.transactionId || 0;

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
      description: item.description || '',
      descriptionName: item.descriptionName || item.description || '',
      appraisalNotes: item.appraisalNotes || item.notes || '',
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
    this.transactionId = 0;
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

  async calculateRenewAmount() {
    // Calculate interest from grant date to now
    if (this.transactionInfo.grantedDate) {
      const grantDate = new Date(this.transactionInfo.grantedDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate daily interest rate and total interest
      const monthlyRate = this.renewComputation.interestRate / 100;
      const dailyRate = monthlyRate / 30;
      this.renewComputation.interest = this.renewComputation.principalLoan * dailyRate * daysDiff;
    } else {
      this.renewComputation.interest = 0;
    }

    // Calculate penalty using PenaltyCalculatorService
    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);

      const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
        this.renewComputation.principalLoan,
        maturityDate
      );

      this.renewComputation.penalty = penaltyDetails.penaltyAmount;
    } else {
      this.renewComputation.penalty = 0;
    }

    // Calculate due amount (interest + penalty that must be paid)
    this.renewComputation.dueAmount = this.renewComputation.interest + this.renewComputation.penalty;

    // If new loan amount is specified, calculate service fee
    if (this.renewComputation.newLoanAmount > 0) {
      // Calculate service charge based on new loan amount
      this.renewComputation.serviceFee = await this.calculateServiceCharge(this.renewComputation.newLoanAmount);
    } else {
      // If no new loan, just renew existing - service fee based on principal
      this.renewComputation.newLoanAmount = this.renewComputation.principalLoan;
      this.renewComputation.serviceFee = await this.calculateServiceCharge(this.renewComputation.principalLoan);
    }

    // Calculate total renew amount customer must pay
    // Total = Due Amount (interest + penalty) + Service Fee - New Loan Amount (if taking additional cash)
    // If newLoanAmount > principalLoan, customer gets cash back
    // If newLoanAmount = principalLoan, customer just pays dues
    const additionalLoan = this.renewComputation.newLoanAmount - this.renewComputation.principalLoan;

    if (additionalLoan > 0) {
      // Customer is taking additional loan, so they pay dues + service fee but get additional loan
      this.renewComputation.totalRenewAmount = this.renewComputation.dueAmount + this.renewComputation.serviceFee - additionalLoan;
    } else {
      // Customer is just renewing existing loan
      this.renewComputation.totalRenewAmount = this.renewComputation.dueAmount + this.renewComputation.serviceFee;
    }

    this.calculateChange();
  }

  async calculateServiceCharge(amount: number): Promise<number> {
    try {
      const response = await fetch('http://localhost:3000/api/service-charge-config/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      const result = await response.json();

      if (result.success) {
        return result.data.serviceCharge;
      } else {
        console.warn('Service charge API returned error, using fallback:', result.message);
        return this.calculateFallbackServiceCharge(amount);
      }
    } catch (error) {
      console.error('Error calculating service charge, using fallback:', error);
      return this.calculateFallbackServiceCharge(amount);
    }
  }

  calculateFallbackServiceCharge(amount: number): number {
    if (amount <= 500) return 10;
    if (amount <= 1000) return 15;
    if (amount <= 5000) return 20;
    if (amount <= 10000) return 30;
    if (amount <= 20000) return 40;
    return 50;
  }

  getPenaltyInfo(): string {
    if (this.renewComputation.penalty === 0) {
      return 'No penalty (within grace period or not yet matured)';
    }

    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 3) {
        return `Daily penalty (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)`;
      } else {
        return `Full month penalty (${daysOverdue} days overdue)`;
      }
    }

    return 'Penalty calculated based on days overdue';
  }

  getInterestInfo(): string {
    if (this.transactionInfo.grantedDate) {
      const grantDate = new Date(this.transactionInfo.grantedDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));
      const monthlyRate = this.renewComputation.interestRate;
      const dailyRate = monthlyRate / 30;

      return `Interest: ${monthlyRate}% monthly (${dailyRate.toFixed(4)}% daily) for ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
    }
    return 'Interest calculation based on days from grant date';
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

  async processRenew() {
    if (!this.canProcessRenew()) {
      this.toastService.showError('Error', 'Invalid renewal amount or insufficient payment');
      return;
    }

    if (!this.transactionId) {
      this.toastService.showError('Error', 'Transaction ID not found');
      return;
    }

    this.isLoading = true;

    try {
      const renewData = {
        transactionId: this.transactionId,
        interestPaid: this.renewComputation.interest,
        penaltyPaid: this.renewComputation.penalty,
        newPrincipal: this.renewComputation.newLoanAmount,
        serviceCharge: this.renewComputation.serviceFee,
        amountReceived: this.renewComputation.receivedAmount,
        change: this.renewComputation.change,
        totalPaid: this.renewComputation.totalRenewAmount
      };

      const response = await fetch('http://localhost:3000/api/transactions/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(renewData)
      });

      const result = await response.json();

      if (result.success) {
        this.toastService.showSuccess('Success', 'Loan renewed successfully');
        setTimeout(() => {
          this.router.navigate(['/cashier-dashboard']);
        }, 1500);
      } else {
        this.toastService.showError('Error', result.message || 'Failed to process renewal');
      }
    } catch (error) {
      console.error('Error processing renewal:', error);
      this.toastService.showError('Error', 'Failed to process renewal');
    } finally {
      this.isLoading = false;
    }
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
