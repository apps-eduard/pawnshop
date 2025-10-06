import { Injectable } from '@angular/core';

export interface PenaltyDetails {
  penaltyAmount: number;
  daysOverdue: number;
  penaltyRate: number;
  principalAmount: number;
  isFullMonthPenalty: boolean;
  dailyPenaltyRate: number;
  monthlyPenaltyAmount: number;
  calculationMethod: 'none' | 'daily' | 'monthly';
}

export interface RedemptionCalculation {
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  serviceCharges: number;
  totalAmountDue: number;
  penaltyDetails: PenaltyDetails;
  breakdown: {
    principal: number;
    interest: number;
    penalty: number;
    serviceCharges: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PenaltyCalculatorService {

  // Constants for penalty calculation
  private readonly PENALTY_RATE_MONTHLY = 0.02; // 2% per month
  private readonly DAYS_IN_MONTH = 30;
  private readonly PENALTY_THRESHOLD_DAYS = 3; // Days threshold for full month penalty

  constructor() {}

  /**
   * Calculate penalty based on business rules:
   * - Less than or equal to 3 days: (principalLoan * 0.02) / 30 * numberOfDays
   * - 4 days or more: principalLoan * 0.02 (full month penalty)
   */
  calculatePenalty(
    principalAmount: number,
    maturityDate: Date,
    currentDate: Date = new Date()
  ): PenaltyDetails {
    // Ensure dates are properly formatted
    const maturity = new Date(maturityDate);
    const current = new Date(currentDate);

    // Calculate days overdue (use floor to count only complete days)
    const timeDifference = current.getTime() - maturity.getTime();
    const daysOverdue = Math.max(0, Math.floor(timeDifference / (1000 * 3600 * 24)));

    const monthlyPenaltyAmount = principalAmount * this.PENALTY_RATE_MONTHLY;
    const dailyPenaltyRate = this.PENALTY_RATE_MONTHLY / this.DAYS_IN_MONTH;

    let penaltyAmount = 0;
    let calculationMethod: 'none' | 'daily' | 'monthly' = 'none';
    let isFullMonthPenalty = false;

    if (daysOverdue === 0) {
      // No penalty if not overdue
      penaltyAmount = 0;
      calculationMethod = 'none';
    } else if (daysOverdue <= this.PENALTY_THRESHOLD_DAYS) {
      // Less than or equal to 3 days: daily calculation
      penaltyAmount = (monthlyPenaltyAmount / this.DAYS_IN_MONTH) * daysOverdue;
      calculationMethod = 'daily';
    } else {
      // 4 days or more: full month penalty
      penaltyAmount = monthlyPenaltyAmount;
      calculationMethod = 'monthly';
      isFullMonthPenalty = true;
    }

    return {
      penaltyAmount: Math.round(penaltyAmount * 100) / 100,
      daysOverdue,
      penaltyRate: this.PENALTY_RATE_MONTHLY,
      principalAmount,
      isFullMonthPenalty,
      dailyPenaltyRate,
      monthlyPenaltyAmount,
      calculationMethod
    };
  }

  /**
   * Calculate total redemption amount including principal, interest, and penalty
   */
  calculateRedemptionAmount(
    principalAmount: number,
    interestRate: number,
    loanDate: Date,
    maturityDate: Date,
    currentDate: Date = new Date(),
    serviceCharges: number = 0
  ): RedemptionCalculation {
    // Calculate penalty
    const penaltyDetails = this.calculatePenalty(principalAmount, maturityDate, currentDate);

    // Calculate interest (this could be more complex based on business rules)
    const loanPeriodDays = Math.ceil((maturityDate.getTime() - loanDate.getTime()) / (1000 * 3600 * 24));
    const interestAmount = (principalAmount * interestRate / 100) * (loanPeriodDays / 30);

    const totalAmountDue = principalAmount + interestAmount + penaltyDetails.penaltyAmount + serviceCharges;

    return {
      principalAmount,
      interestAmount: Math.round(interestAmount * 100) / 100,
      penaltyAmount: penaltyDetails.penaltyAmount,
      serviceCharges,
      totalAmountDue: Math.round(totalAmountDue * 100) / 100,
      penaltyDetails,
      breakdown: {
        principal: principalAmount,
        interest: Math.round(interestAmount * 100) / 100,
        penalty: penaltyDetails.penaltyAmount,
        serviceCharges
      }
    };
  }

  /**
   * Calculate partial payment application
   */
  calculatePartialPaymentApplication(
    paymentAmount: number,
    principalAmount: number,
    interestAmount: number,
    penaltyAmount: number,
    serviceCharges: number = 0
  ): {
    appliedToPenalty: number;
    appliedToInterest: number;
    appliedToPrincipal: number;
    appliedToServiceCharges: number;
    remainingBalance: number;
    fullyPaid: boolean;
  } {
    let remainingPayment = paymentAmount;
    let appliedToPenalty = 0;
    let appliedToServiceCharges = 0;
    let appliedToInterest = 0;
    let appliedToPrincipal = 0;

    // Payment priority: Service Charges -> Penalty -> Interest -> Principal

    // Apply to service charges first
    if (remainingPayment > 0 && serviceCharges > 0) {
      appliedToServiceCharges = Math.min(remainingPayment, serviceCharges);
      remainingPayment -= appliedToServiceCharges;
    }

    // Apply to penalty next
    if (remainingPayment > 0 && penaltyAmount > 0) {
      appliedToPenalty = Math.min(remainingPayment, penaltyAmount);
      remainingPayment -= appliedToPenalty;
    }

    // Apply to interest
    if (remainingPayment > 0 && interestAmount > 0) {
      appliedToInterest = Math.min(remainingPayment, interestAmount);
      remainingPayment -= appliedToInterest;
    }

    // Apply to principal
    if (remainingPayment > 0 && principalAmount > 0) {
      appliedToPrincipal = Math.min(remainingPayment, principalAmount);
      remainingPayment -= appliedToPrincipal;
    }

    const totalDue = principalAmount + interestAmount + penaltyAmount + serviceCharges;
    const totalApplied = appliedToPenalty + appliedToInterest + appliedToPrincipal + appliedToServiceCharges;
    const remainingBalance = Math.max(0, totalDue - totalApplied);
    const fullyPaid = remainingBalance === 0;

    return {
      appliedToPenalty: Math.round(appliedToPenalty * 100) / 100,
      appliedToInterest: Math.round(appliedToInterest * 100) / 100,
      appliedToPrincipal: Math.round(appliedToPrincipal * 100) / 100,
      appliedToServiceCharges: Math.round(appliedToServiceCharges * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
      fullyPaid
    };
  }

  /**
   * Format penalty details for display
   */
  formatPenaltyDetails(penaltyDetails: PenaltyDetails): string {
    if (penaltyDetails.calculationMethod === 'none') {
      return 'No penalty (loan not overdue)';
    }

    if (penaltyDetails.calculationMethod === 'daily') {
      return `Daily penalty: ₱${penaltyDetails.penaltyAmount.toFixed(2)} (${penaltyDetails.daysOverdue} days × ₱${(penaltyDetails.monthlyPenaltyAmount / 30).toFixed(2)}/day)`;
    }

    return `Monthly penalty: ₱${penaltyDetails.penaltyAmount.toFixed(2)} (${penaltyDetails.daysOverdue} days overdue, full month rate)`;
  }

  /**
   * Check if loan is overdue
   */
  isLoanOverdue(maturityDate: Date, currentDate: Date = new Date()): boolean {
    return currentDate > new Date(maturityDate);
  }

  /**
   * Get days until maturity (negative if overdue)
   */
  getDaysUntilMaturity(maturityDate: Date, currentDate: Date = new Date()): number {
    const timeDifference = new Date(maturityDate).getTime() - currentDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
  }
}
