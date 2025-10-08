import { Injectable } from '@angular/core';

export interface NewTransactionDates {
  newMaturityDate: string;      // YYYY-MM-DD format
  newGracePeriodDate: string;   // YYYY-MM-DD format (Maturity + 3 days)
  newExpiryDate: string;        // YYYY-MM-DD format
}

@Injectable({
  providedIn: 'root'
})
export class TransactionDateService {

  constructor() {}

  /**
   * Calculate new transaction dates based on business rules
   * Used by: Additional Loan, Partial Payment, Renew, Redeem (when applicable)
   * 
   * @param baseDate - The starting date for calculation (default: today)
   * @param maturityDays - Days until maturity (default: 30 days)
   * @param gracePeriodDays - Grace period after maturity (default: 3 days)
   * @param expiryDaysFromMaturity - Days from maturity to expiry (default: 90 days)
   * @returns Object with new transaction dates in YYYY-MM-DD format
   */
  calculateNewDates(
    baseDate: Date = new Date(),
    maturityDays: number = 30,
    gracePeriodDays: number = 3,
    expiryDaysFromMaturity: number = 90
  ): NewTransactionDates {
    const base = new Date(baseDate);

    // New maturity date = Base date + maturity days
    const newMaturity = new Date(base);
    newMaturity.setDate(newMaturity.getDate() + maturityDays);

    // New grace period date = Maturity date + grace period days
    const newGracePeriod = new Date(newMaturity);
    newGracePeriod.setDate(newGracePeriod.getDate() + gracePeriodDays);

    // New expiry date = Maturity date + expiry days
    const newExpiry = new Date(newMaturity);
    newExpiry.setDate(newExpiry.getDate() + expiryDaysFromMaturity);

    return {
      newMaturityDate: this.formatDate(newMaturity),
      newGracePeriodDate: this.formatDate(newGracePeriod),
      newExpiryDate: this.formatDate(newExpiry)
    };
  }

  /**
   * Calculate new dates for Additional Loan transactions
   * Standard: 30 days maturity from today
   */
  calculateAdditionalLoanDates(): NewTransactionDates {
    return this.calculateNewDates(new Date(), 30, 3, 90);
  }

  /**
   * Calculate new dates for Partial Payment transactions
   * Standard: 30 days maturity from today
   */
  calculatePartialPaymentDates(): NewTransactionDates {
    return this.calculateNewDates(new Date(), 30, 3, 90);
  }

  /**
   * Calculate new dates for Renew transactions
   * Standard: 30 days maturity from today
   * Can be extended to 4 months (120 days) based on business rules
   */
  calculateRenewDates(extensionMonths: number = 1): NewTransactionDates {
    const maturityDays = extensionMonths * 30; // 1 month = 30 days
    return this.calculateNewDates(new Date(), maturityDays, 3, 90);
  }

  /**
   * Calculate new dates based on original maturity date
   * Useful for extending from existing maturity instead of today
   */
  calculateDatesFromMaturity(
    originalMaturityDate: Date,
    extensionDays: number = 30
  ): NewTransactionDates {
    const maturity = new Date(originalMaturityDate);
    maturity.setDate(maturity.getDate() + extensionDays);

    const gracePeriod = new Date(maturity);
    gracePeriod.setDate(gracePeriod.getDate() + 3);

    const expiry = new Date(maturity);
    expiry.setDate(expiry.getDate() + 90);

    return {
      newMaturityDate: this.formatDate(maturity),
      newGracePeriodDate: this.formatDate(gracePeriod),
      newExpiryDate: this.formatDate(expiry)
    };
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get days between two dates
   */
  getDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if a date is within grace period
   */
  isWithinGracePeriod(currentDate: Date, maturityDate: Date, gracePeriodDays: number = 3): boolean {
    const daysAfterMaturity = this.getDaysBetween(maturityDate, currentDate);
    return daysAfterMaturity >= 0 && daysAfterMaturity <= gracePeriodDays;
  }

  /**
   * Add days to a date and return formatted string
   */
  addDays(date: Date, days: number): string {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return this.formatDate(newDate);
  }

  /**
   * Add months to a date and return formatted string
   */
  addMonths(date: Date, months: number): string {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return this.formatDate(newDate);
  }
}
