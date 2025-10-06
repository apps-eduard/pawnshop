import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TransactionInfoComponent } from '../../../shared/components/transaction/transaction-info.component';
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';
import { InvoiceModalComponent } from '../../../shared/modals/invoice-modal/invoice-modal.component';
import { LoanInvoiceData } from '../../../shared/components/loan-invoice/loan-invoice.component';

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
  description: string;
  descriptionName: string;
  appraisalNotes: string;
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
  imports: [CommonModule, FormsModule, TransactionInfoComponent, InvoiceModalComponent],
  templateUrl: './partial-payment.html',
  styleUrl: './partial-payment.css'
})
export class PartialPayment implements OnInit {

  searchTicketNumber: string = '';
  transactionNumber: string = '';
  transactionId: number = 0;
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

  // Invoice modal state
  showInvoiceModal: boolean = false;
  invoiceData: LoanInvoiceData | null = null;

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService,
    private penaltyCalculatorService: PenaltyCalculatorService
  ) {}

  ngOnInit() {
    // Start with empty form - no initial calculation
    console.log('Partial Payment page loaded - form cleared');
  }

  getTotalAppraisalValue(): number {
    return this.pawnedItems.reduce((total, item) => total + item.appraisalValue, 0);
  }

  async calculatePartialPayment() {
    console.log('💰 calculatePartialPayment called with:', {
      principalLoan: this.partialComputation.principalLoan,
      partialPay: this.partialComputation.partialPay,
      interestRate: this.partialComputation.interestRate
    });

    // Update appraisal value from items
    this.partialComputation.appraisalValue = this.getTotalAppraisalValue();

    // Calculate days overdue to set automatic discount
    let autoDiscount = 0;
    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Auto-set discount: Only for days 1-3, 0 if greater than 3 (full month penalty applies)
      if (daysOverdue === 3) {
        autoDiscount = 3;
      } else if (daysOverdue === 2) {
        autoDiscount = 2;
      } else if (daysOverdue === 1) {
        autoDiscount = 1;
      } else if (daysOverdue > 3) {
        autoDiscount = 0; // No discount for day 4+ (full month penalty)
      }
      
      // Apply auto discount only if user hasn't manually changed it
      if (this.partialComputation.discount === 0) {
        this.partialComputation.discount = autoDiscount;
      }
      
      console.log(`🎯 Auto-discount set: ${autoDiscount} days (overdue: ${daysOverdue} days)`);
    }

    // Calculate interest from grant date to now (EXCLUDING the first 30 days already paid)
    if (this.transactionInfo.grantedDate) {
      const grantDate = new Date(this.transactionInfo.grantedDate);
      const now = new Date();
      const totalDays = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only count days AFTER the first 30 days (which were already paid in advance)
      const additionalDays = Math.max(0, totalDays - 30);

      // Calculate daily interest rate and interest for additional days only
      const monthlyRate = this.partialComputation.interestRate / 100;
      const dailyRate = monthlyRate / 30;

      // Interest only for days beyond the first 30 days
      const baseInterest = this.partialComputation.principalLoan * dailyRate * additionalDays;

      // Apply discount (discount represents days to waive)
      const discountDays = this.partialComputation.discount;
      const discountAmount = this.partialComputation.principalLoan * dailyRate * discountDays;

      this.partialComputation.interest = Math.max(0, baseInterest - discountAmount);

      console.log(`📅 Days calculation: Total=${totalDays}, Additional=${additionalDays}, Discount=${discountDays} days`);
      console.log(`💰 Interest: Base=${baseInterest.toFixed(2)}, Discount=${discountAmount.toFixed(2)}, Final=${this.partialComputation.interest.toFixed(2)}`);
    } else {
      this.partialComputation.interest = 0;
    }

    // Calculate penalty using PenaltyCalculatorService
    if (this.transactionInfo.maturedDate) {
      const maturityDate = new Date(this.transactionInfo.maturedDate);
      const now = new Date();

      // Use the penalty calculator service to get the base penalty
      const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
        this.partialComputation.principalLoan,
        maturityDate,
        now
      );

      console.log(`⚠️ Penalty Details from Service:`, {
        daysOverdue: penaltyDetails.daysOverdue,
        penaltyAmount: penaltyDetails.penaltyAmount,
        calculationMethod: penaltyDetails.calculationMethod,
        isFullMonthPenalty: penaltyDetails.isFullMonthPenalty,
        dailyPenaltyRate: penaltyDetails.dailyPenaltyRate,
        monthlyPenaltyAmount: penaltyDetails.monthlyPenaltyAmount
      });

      if (penaltyDetails.daysOverdue > 0) {
        let finalPenalty = penaltyDetails.penaltyAmount;

        // Apply discount based on calculation method
        if (this.partialComputation.discount > 0) {
          if (penaltyDetails.isFullMonthPenalty) {
            // For full month penalty (4+ days), discount can't reduce it - user already gets full month
            // Unless they want to waive it completely, but that's administrative
            finalPenalty = penaltyDetails.penaltyAmount;
            console.log(`⚠️ Full month penalty applied (4+ days), discount does not apply`);
          } else {
            // For daily penalty (1-3 days), apply discount per day
            const discountDays = Math.min(this.partialComputation.discount, penaltyDetails.daysOverdue);
            const penaltyDiscountAmount = penaltyDetails.dailyPenaltyRate * this.partialComputation.principalLoan * discountDays;
            finalPenalty = Math.max(0, penaltyDetails.penaltyAmount - penaltyDiscountAmount);

            console.log(`⚠️ Daily penalty with discount:`, {
              basePenalty: penaltyDetails.penaltyAmount.toFixed(2),
              daysOverdue: penaltyDetails.daysOverdue,
              discountDays,
              penaltyDiscountAmount: penaltyDiscountAmount.toFixed(2),
              finalPenalty: finalPenalty.toFixed(2)
            });
          }
        }

        this.partialComputation.penalty = finalPenalty;
      } else {
        this.partialComputation.penalty = 0;
      }
    } else {
      this.partialComputation.penalty = 0;
    }

    // Calculate total obligation (principal + interest + penalty)
    const totalObligation = this.partialComputation.principalLoan +
                           this.partialComputation.interest +
                           this.partialComputation.penalty;

    // Calculate redeem amount (what customer needs to pay to fully redeem)
    this.partialComputation.redeemAmount = totalObligation;

    // If partial payment is specified, calculate new principal and advance charges
    if (this.partialComputation.partialPay > 0) {
      // New Principal = Current Principal - Partial Payment
      this.partialComputation.newPrincipalLoan = this.partialComputation.principalLoan - this.partialComputation.partialPay;

      // Calculate advance interest for 1 month on new principal
      const monthlyRate = this.partialComputation.interestRate / 100;
      this.partialComputation.advanceInterest = this.partialComputation.newPrincipalLoan * monthlyRate;

      // Calculate service charge based on new principal
      console.log('🔍 Calculating service charge for amount:', this.partialComputation.newPrincipalLoan);
      this.partialComputation.advServiceCharge = await this.calculateServiceCharge(this.partialComputation.newPrincipalLoan);
      console.log('💵 Service charge calculated:', this.partialComputation.advServiceCharge);

      // Net Payment = Partial Pay + Interest + Penalty + Advance Interest + Adv Service Charge
      this.partialComputation.netPayment =
        this.partialComputation.partialPay +
        this.partialComputation.interest +
        this.partialComputation.penalty +
        this.partialComputation.advanceInterest +
        this.partialComputation.advServiceCharge;

      console.log('📊 Final computation:', {
        partialPay: this.partialComputation.partialPay,
        interest: this.partialComputation.interest,
        penalty: this.partialComputation.penalty,
        advanceInterest: this.partialComputation.advanceInterest,
        advServiceCharge: this.partialComputation.advServiceCharge,
        netPayment: this.partialComputation.netPayment,
        newPrincipalLoan: this.partialComputation.newPrincipalLoan
      });
    } else {
      // No partial payment specified
      console.log('⚠️ No partial payment specified, setting values to 0');
      this.partialComputation.newPrincipalLoan = this.partialComputation.principalLoan;
      this.partialComputation.advanceInterest = 0;
      this.partialComputation.advServiceCharge = 0;
      this.partialComputation.netPayment = 0;
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
        body: JSON.stringify({ principalAmount: amount }) // Backend expects 'principalAmount', not 'amount'
      });

      const result = await response.json();

      console.log('📥 Service charge API response:', result);

      if (result.success) {
        return result.data.serviceChargeAmount; // Backend returns 'serviceChargeAmount', not 'serviceCharge'
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
    if (this.partialComputation.penalty === 0) {
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
      const monthlyRate = this.partialComputation.interestRate;
      const dailyRate = monthlyRate / 30;

      return `Interest: ${monthlyRate}% monthly (${dailyRate.toFixed(4)}% daily) for ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
    }
    return 'Interest calculation based on days from grant date';
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
        await this.populateForm(result.data); // Await the async populateForm
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

  private async populateForm(data: any) {
    // Set transaction number and ID
    this.transactionNumber = data.ticketNumber;
    this.transactionId = data.id || 0; // Use data.id which is the transaction ID

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
      description: item.description || '',
      descriptionName: item.descriptionName || item.description || '',
      appraisalNotes: item.appraisalNotes || item.notes || '',
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
    console.log('🔄 About to calculate partial payment...');
    await this.calculatePartialPayment(); // Await the async calculation
    console.log('✅ Partial payment calculated:', {
      newPrincipalLoan: this.partialComputation.newPrincipalLoan,
      advanceInterest: this.partialComputation.advanceInterest,
      advServiceCharge: this.partialComputation.advServiceCharge,
      netPayment: this.partialComputation.netPayment
    });
  }

  private clearForm() {
    this.transactionNumber = '';
    this.transactionId = 0;
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

  async processPayment() {
    if (!this.canProcessPayment()) {
      this.toastService.showError('Error', 'Amount received is insufficient');
      return;
    }

    if (!this.transactionId) {
      this.toastService.showError('Error', 'Transaction ID not found');
      return;
    }

    this.isLoading = true;

    try {
      const paymentData = {
        ticketId: this.transactionId, // Backend expects 'ticketId', not 'transactionId'
        partialPayment: this.partialComputation.partialPay,
        newPrincipalLoan: this.partialComputation.newPrincipalLoan, // Backend expects 'newPrincipalLoan', not 'newPrincipal'
        discountAmount: this.partialComputation.discount || 0,
        advanceInterest: this.partialComputation.advanceInterest,
        netPayment: this.partialComputation.netPayment,
        notes: `Partial payment - Change: ₱${this.partialComputation.change.toFixed(2)}`
      };

      console.log('💳 Sending partial payment data:', paymentData);

      const response = await fetch('http://localhost:3000/api/transactions/partial-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success) {
        this.toastService.showSuccess('Success', 'Partial payment processed successfully');

        // Prepare invoice data
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        this.invoiceData = {
          transactionType: 'partial_payment',
          transactionNumber: result.data?.transactionId || this.transactionNumber,
          ticketNumber: this.searchTicketNumber,
          transactionDate: new Date(),
          pawnerName: `${this.customerInfo.firstName} ${this.customerInfo.lastName}`,
          pawnerContact: this.customerInfo.contactNumber,
          pawnerAddress: this.customerInfo.completeAddress || 'N/A',
          items: this.pawnedItems.map(item => ({
            category: item.category || 'N/A',
            description: item.description || 'N/A',
            appraisedValue: item.appraisalValue || 0
          })),
          principalAmount: this.partialComputation.principalLoan,
          interestRate: this.partialComputation.interestRate,
          interestAmount: this.partialComputation.interest,
          serviceCharge: this.partialComputation.advServiceCharge,
          paymentAmount: this.partialComputation.amountReceived,
          totalAmount: this.partialComputation.netPayment,
          previousBalance: this.partialComputation.principalLoan,
          remainingBalance: this.partialComputation.newPrincipalLoan,
          loanDate: new Date(this.transactionInfo.grantedDate),
          maturityDate: new Date(this.transactionInfo.maturedDate),
          expiryDate: new Date(this.transactionInfo.expiredDate),
          branchName: user.branch_name || 'Main Branch',
          cashierName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          notes: `Partial Payment - Change: ₱${this.partialComputation.change.toFixed(2)}`
        };

        // Show invoice modal
        this.showInvoiceModal = true;
      } else {
        this.toastService.showError('Error', result.message || 'Failed to process partial payment');
      }
    } catch (error) {
      console.error('Error processing partial payment:', error);
      this.toastService.showError('Error', 'Failed to process partial payment');
    } finally {
      this.isLoading = false;
    }
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

  // Close invoice modal and navigate back
  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceData = null;
    this.router.navigate(['/cashier-dashboard']);
  }
}
