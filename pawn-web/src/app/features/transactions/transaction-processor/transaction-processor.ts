import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService, RedeemRequest, RenewRequest, AdditionalLoanRequest, PartialPaymentRequest } from '../../../core/services/transaction.service';
import { PenaltyCalculatorService, PenaltyDetails, RedemptionCalculation } from '../../../core/services/penalty-calculator.service';
import { Loan, TransactionType } from '../../../core/models/interfaces';

@Component({
  selector: 'app-transaction-processor',
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Transaction Processor</h1>
      <p>Transaction processing functionality will be implemented here.</p>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TransactionProcessorComponent implements OnInit {

  // Current loan being processed
  currentLoan: Loan | null = null;

  // Penalty and calculation data
  penaltyDetails: PenaltyDetails | null = null;
  redemptionCalculation: RedemptionCalculation | null = null;

  // Transaction forms
  redeemForm = {
    paymentAmount: 0,
    paymentMethod: 'CASH' as 'CASH' | 'CHEQUE',
    remarks: ''
  };

  renewForm = {
    newMaturityDate: '',
    additionalInterest: 0,
    serviceCharge: 0,
    remarks: ''
  };

  additionalForm = {
    additionalAmount: 0,
    newAppraisalValue: 0,
    remarks: ''
  };

  partialForm = {
    paymentAmount: 0,
    paymentMethod: 'CASH' as 'CASH' | 'CHEQUE',
    remarks: ''
  };

  // UI state
  selectedTransactionType: TransactionType | null = null;
  isProcessing = false;
  showCalculations = false;

  constructor(
    private transactionService: TransactionService,
    private penaltyCalculator: PenaltyCalculatorService
  ) {}

  ngOnInit() {
    // Initialize component
  }

  // ============= LOAN LOADING AND CALCULATION =============

  loadLoanDetails(loanId: string) {
    this.isProcessing = true;

    this.transactionService.getLoanWithPenalty(loanId).subscribe({
      next: (response: any) => {
        this.currentLoan = response.data;
        this.calculatePenaltyAndRedemption();
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error('Error loading loan details:', error);
        this.isProcessing = false;
      }
    });
  }

  calculatePenaltyAndRedemption() {
    if (!this.currentLoan) return;

    // Calculate penalty
    this.penaltyDetails = this.penaltyCalculator.calculatePenalty(
      this.currentLoan.principalLoan,
      this.currentLoan.maturedDate
    );

    // Calculate full redemption amount
    this.redemptionCalculation = this.penaltyCalculator.calculateRedemptionAmount(
      this.currentLoan.principalLoan,
      this.currentLoan.interestRate,
      this.currentLoan.grantedDate,
      this.currentLoan.maturedDate,
      new Date(),
      this.currentLoan.advanceServiceCharge || 0
    );

    // Set default redemption amount
    this.redeemForm.paymentAmount = this.redemptionCalculation.totalAmountDue;

    this.showCalculations = true;
  }

  // ============= TRANSACTION PROCESSING METHODS =============

  processRedeem() {
    if (!this.currentLoan) return;

    const request: RedeemRequest = {
      loanId: this.currentLoan.id,
      paymentAmount: this.redeemForm.paymentAmount,
      paymentMethod: this.redeemForm.paymentMethod,
      remarks: this.redeemForm.remarks
    };

    this.isProcessing = true;

    this.transactionService.redeemLoan(request).subscribe({
      next: (response: any) => {
        console.log('Loan redeemed successfully:', response);
        this.onTransactionSuccess('Loan redeemed successfully');
      },
      error: (error: any) => {
        console.error('Error redeeming loan:', error);
        this.onTransactionError('Failed to redeem loan');
      }
    });
  }

  processRenew() {
    if (!this.currentLoan) return;

    const request: RenewRequest = {
      loanId: this.currentLoan.id,
      newMaturityDate: new Date(this.renewForm.newMaturityDate),
      additionalInterest: this.renewForm.additionalInterest,
      serviceCharge: this.renewForm.serviceCharge,
      remarks: this.renewForm.remarks
    };

    this.isProcessing = true;

    this.transactionService.renewLoan(request).subscribe({
      next: (response: any) => {
        console.log('Loan renewed successfully:', response);
        this.onTransactionSuccess('Loan renewed successfully');
      },
      error: (error: any) => {
        console.error('Error renewing loan:', error);
        this.onTransactionError('Failed to renew loan');
      }
    });
  }

  processAdditional() {
    if (!this.currentLoan) return;

    const request: AdditionalLoanRequest = {
      loanId: this.currentLoan.id,
      additionalAmount: this.additionalForm.additionalAmount,
      newAppraisalValue: this.additionalForm.newAppraisalValue,
      remarks: this.additionalForm.remarks
    };

    this.isProcessing = true;

    this.transactionService.addAdditionalLoan(request).subscribe({
      next: (response: any) => {
        console.log('Additional loan processed successfully:', response);
        this.onTransactionSuccess('Additional loan amount added successfully');
      },
      error: (error: any) => {
        console.error('Error processing additional loan:', error);
        this.onTransactionError('Failed to process additional loan');
      }
    });
  }

  processPartialPayment() {
    if (!this.currentLoan || !this.redemptionCalculation) return;

    // Calculate how the partial payment will be applied
    const paymentApplication = this.penaltyCalculator.calculatePartialPaymentApplication(
      this.partialForm.paymentAmount,
      this.redemptionCalculation.principalAmount,
      this.redemptionCalculation.interestAmount,
      this.redemptionCalculation.penaltyAmount,
      this.redemptionCalculation.serviceCharges
    );

    const request: PartialPaymentRequest = {
      loanId: this.currentLoan.id,
      paymentAmount: this.partialForm.paymentAmount,
      paymentMethod: this.partialForm.paymentMethod,
      remarks: this.partialForm.remarks
    };

    this.isProcessing = true;

    this.transactionService.processPartialPayment(request).subscribe({
      next: (response: any) => {
        console.log('Partial payment processed successfully:', response);
        console.log('Payment application:', paymentApplication);
        this.onTransactionSuccess(`Partial payment of ₱${this.partialForm.paymentAmount.toFixed(2)} processed successfully`);
      },
      error: (error: any) => {
        console.error('Error processing partial payment:', error);
        this.onTransactionError('Failed to process partial payment');
      }
    });
  }

  // ============= UTILITY METHODS =============

  selectTransactionType(type: TransactionType) {
    this.selectedTransactionType = type;

    // Reset forms when switching transaction types
    this.resetForms();

    // Set default values based on transaction type
    if (type === TransactionType.REDEEM && this.redemptionCalculation) {
      this.redeemForm.paymentAmount = this.redemptionCalculation.totalAmountDue;
    }
  }

  resetForms() {
    this.redeemForm = {
      paymentAmount: 0,
      paymentMethod: 'CASH',
      remarks: ''
    };

    this.renewForm = {
      newMaturityDate: '',
      additionalInterest: 0,
      serviceCharge: 0,
      remarks: ''
    };

    this.additionalForm = {
      additionalAmount: 0,
      newAppraisalValue: 0,
      remarks: ''
    };

    this.partialForm = {
      paymentAmount: 0,
      paymentMethod: 'CASH',
      remarks: ''
    };
  }

  onTransactionSuccess(message: string) {
    this.isProcessing = false;
    // Show success message (you can implement toast service here)
    alert(message);
    // Reload loan details to reflect changes
    if (this.currentLoan) {
      this.loadLoanDetails(this.currentLoan.id);
    }
  }

  onTransactionError(message: string) {
    this.isProcessing = false;
    // Show error message (you can implement toast service here)
    alert(message);
  }

  // ============= CALCULATION HELPERS =============

  getPenaltyDisplayText(): string {
    if (!this.penaltyDetails) return '';
    return this.penaltyCalculator.formatPenaltyDetails(this.penaltyDetails);
  }

  isLoanOverdue(): boolean {
    if (!this.currentLoan) return false;
    return this.penaltyCalculator.isLoanOverdue(this.currentLoan.maturedDate);
  }

  getDaysUntilMaturity(): number {
    if (!this.currentLoan) return 0;
    return this.penaltyCalculator.getDaysUntilMaturity(this.currentLoan.maturedDate);
  }

  calculatePartialPaymentPreview(): any {
    if (!this.redemptionCalculation || !this.partialForm.paymentAmount) return null;

    return this.penaltyCalculator.calculatePartialPaymentApplication(
      this.partialForm.paymentAmount,
      this.redemptionCalculation.principalAmount,
      this.redemptionCalculation.interestAmount,
      this.redemptionCalculation.penaltyAmount,
      this.redemptionCalculation.serviceCharges
    );
  }

  // ============= FORM VALIDATION =============

  canProcessRedeem(): boolean {
    return !!(this.currentLoan && this.redeemForm.paymentAmount > 0 && this.redemptionCalculation);
  }

  canProcessRenew(): boolean {
    return !!(this.currentLoan && this.renewForm.newMaturityDate);
  }

  canProcessAdditional(): boolean {
    return !!(this.currentLoan && this.additionalForm.additionalAmount > 0);
  }

  canProcessPartial(): boolean {
    return !!(this.currentLoan && this.partialForm.paymentAmount > 0 && this.redemptionCalculation);
  }
}
