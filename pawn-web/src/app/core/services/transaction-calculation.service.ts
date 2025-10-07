import { Injectable } from '@angular/core';

export interface TransactionInfo {
  transactionDate: string;
  grantedDate: string;
  maturedDate: string;
  expiredDate: string;
}

export interface DurationInfo {
  years: number;
  months: number;
  days: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionCalculationService {
  constructor() {}

  /**
   * Calculate loan status based on current date vs maturity and expiry dates
   * @param maturedDate - Maturity date of the loan
   * @param expiredDate - Expiry date of the loan
   * @returns Status string: 'Premature', 'Matured', 'Expired', or 'Unknown'
   */
  getLoanStatus(maturedDate: string, expiredDate: string): string {
    if (!maturedDate || !expiredDate) {
      return 'Unknown';
    }

    const now = new Date();
    const maturity = new Date(maturedDate);
    const expiry = new Date(expiredDate);

    // Clear time components for accurate date comparison
    now.setHours(0, 0, 0, 0);
    maturity.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    if (now > expiry) {
      return 'Expired';
    } else if (now >= maturity) {
      return 'Matured';
    } else {
      return 'Premature';
    }
  }

  /**
   * Calculate duration from maturity date to current date
   * For premature loans (not yet matured), returns 0Y 0M 0D
   * For matured/expired loans, shows how long past maturity
   * @param maturedDate - Maturity date of the loan
   * @returns DurationInfo object with years, months, and days
   */
  getDuration(maturedDate: string): DurationInfo {
    if (!maturedDate) {
      return { years: 0, months: 0, days: 0 };
    }

    const maturity = new Date(maturedDate);
    const now = new Date();

    // Clear time components
    maturity.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - maturity.getTime();

    // If loan is premature (not yet matured), return 0Y 0M 0D
    if (diffTime < 0) {
      return { years: 0, months: 0, days: 0 };
    }

    // Calculate years
    const years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));

    // Calculate total months and subtract years in months
    const totalMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    const months = totalMonths - (years * 12);

    // Calculate remaining days
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const days = totalDays - (years * 365) - (months * 30);

    return { years, months, days };
  }  /**
   * Get CSS class for status badge
   * @param status - Loan status
   * @returns CSS class string
   */
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'premature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'matured':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  /**
   * Get CSS classes for duration badges
   * @param status - Loan status
   * @returns Object with CSS classes for years, months, and days badges
   */
  getDurationBadgeColors(status: string): {years: string, months: string, days: string} {
    switch (status.toLowerCase()) {
      case 'premature':
        return {
          years: 'from-blue-500 to-blue-600',
          months: 'from-indigo-500 to-indigo-600',
          days: 'from-cyan-500 to-cyan-600'
        };
      case 'matured':
        return {
          years: 'from-yellow-500 to-yellow-600',
          months: 'from-orange-500 to-orange-600',
          days: 'from-amber-500 to-amber-600'
        };
      case 'expired':
        return {
          years: 'from-red-500 to-red-600',
          months: 'from-rose-500 to-rose-600',
          days: 'from-pink-500 to-pink-600'
        };
      default:
        return {
          years: 'from-gray-500 to-gray-600',
          months: 'from-slate-500 to-slate-600',
          days: 'from-zinc-500 to-zinc-600'
        };
    }
  }

  /**
   * Get animation class for duration (pulse effect for expired loans)
   * @param status - Loan status
   * @returns CSS animation class
   */
  getDurationAnimationClass(status: string): string {
    return status.toLowerCase() === 'expired' ? 'animate-pulse' : '';
  }
}
