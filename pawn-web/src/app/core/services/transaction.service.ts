import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransactionType, Loan, LoanTransaction } from '../models/interfaces';

export interface Transaction {
  id: number;
  transaction_number: string;
  type: 'new_loan' | 'payment' | 'renewal' | 'redemption' | 'additional' | 'partial';
  customer_name: string;
  pawner_name: string;
  amount: number;
  principal_amount: number;
  status: 'completed' | 'pending' | 'failed' | 'active';
  created_at: Date;
  loan_date: Date;
  maturity_date: Date;
  expiry_date: Date;
  items?: Array<{
    id: number;
    categoryId: number;
    categoryName: string;
    descriptionId: number;
    descriptionName: string;
    appraisalNotes: string;
    appraisedValue: number;
    loanAmount: number;
    status: string;
  }>;
  transactionHistory?: Array<{
    id: number;
    transactionNumber: string;
    transactionType: string;
    transactionDate: Date;
    principalAmount: number;
    amountPaid: number;
    balance: number;
    status: string;
    notes: string;
    createdBy: number;
    createdAt: Date;
    // Partial payment specific fields
    newPrincipalLoan?: number;
    totalAmount?: number;
    discountAmount?: number;
    advanceInterest?: number;
    advanceServiceCharge?: number;
    netPayment?: number;
  }>;
}

export interface PenaltyCalculation {
  penaltyAmount: number;
  daysOverdue: number;
  penaltyRate: number;
  principalAmount: number;
  isFullMonthPenalty: boolean;
}

export interface RedeemRequest {
  loanId: string;
  paymentAmount: number;
  paymentMethod: 'CASH' | 'CHEQUE';
  remarks?: string;
}

export interface RenewRequest {
  loanId: string;
  newMaturityDate: Date;
  additionalInterest?: number;
  serviceCharge?: number;
  remarks?: string;
}

export interface AdditionalLoanRequest {
  loanId: string;
  additionalAmount: number;
  newAppraisalValue?: number;
  remarks?: string;
}

export interface PartialPaymentRequest {
  loanId: string;
  paymentAmount: number;
  paymentMethod: 'CASH' | 'CHEQUE';
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly API_URL = 'http://localhost:3000/api';
  private apiUrl = `${this.API_URL}/transactions`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get recent transactions (last 10)
  getRecentTransactions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?limit=10&sort=created_at&order=desc`, {
      headers: this.getHeaders()
    });
  }

  // Get all transactions
  getAllTransactions(): Observable<any> {
    return this.http.get<any>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  // Get transaction by ID
  getTransactionById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Get transactions by status
  getTransactionsByStatus(status: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?status=${status}`, {
      headers: this.getHeaders()
    });
  }

  // Get today's transactions
  getTodaysTransactions(): Observable<any> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<any>(`${this.apiUrl}?date=${today}`, {
      headers: this.getHeaders()
    });
  }

  // Create new transaction
  createTransaction(transactionData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, transactionData, {
      headers: this.getHeaders()
    });
  }

  // ============= PENALTY COMPUTATION METHODS =============

  /**
   * Calculate penalty based on the specified rules:
   * - Less than 3 days: (principalLoan * 0.02) / 30 * numberOfDays
   * - 4 days or more: principalLoan * 0.02 (full month penalty)
   */
  calculatePenalty(principalAmount: number, maturityDate: Date, currentDate: Date = new Date()): PenaltyCalculation {
    const oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds
    const daysOverdue = Math.max(0, Math.floor((currentDate.getTime() - maturityDate.getTime()) / oneDay));

    const penaltyRate = 0.02; // 2% per month
    const monthlyPenalty = principalAmount * penaltyRate;

    let penaltyAmount = 0;
    let isFullMonthPenalty = false;

    if (daysOverdue === 0) {
      // No penalty if not overdue
      penaltyAmount = 0;
    } else if (daysOverdue <= 3) {
      // Less than or equal to 3 days: daily calculation
      penaltyAmount = (monthlyPenalty / 30) * daysOverdue;
    } else {
      // 4 days or more: full month penalty
      penaltyAmount = monthlyPenalty;
      isFullMonthPenalty = true;
    }

    return {
      penaltyAmount: Math.round(penaltyAmount * 100) / 100, // Round to 2 decimal places
      daysOverdue,
      penaltyRate,
      principalAmount,
      isFullMonthPenalty
    };
  }

  /**
   * Get penalty calculation for a specific loan
   */
  getLoanPenalty(loanId: string): Observable<PenaltyCalculation> {
    return this.http.get<PenaltyCalculation>(`${this.apiUrl}/${loanId}/penalty`, {
      headers: this.getHeaders()
    });
  }

  // ============= TRANSACTION OPERATION METHODS =============

  /**
   * Redeem a loan (full payment)
   */
  redeemLoan(request: RedeemRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/redeem`, request, {
      headers: this.getHeaders()
    });
  }

  /**
   * Renew a loan (extend maturity date)
   */
  renewLoan(request: RenewRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/renew`, request, {
      headers: this.getHeaders()
    });
  }

  /**
   * Add additional loan amount to existing loan
   */
  addAdditionalLoan(request: AdditionalLoanRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/additional`, request, {
      headers: this.getHeaders()
    });
  }

  /**
   * Process partial payment
   */
  processPartialPayment(request: PartialPaymentRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/partial-payment`, request, {
      headers: this.getHeaders()
    });
  }

  // ============= UTILITY METHODS =============

  /**
   * Get loan details with penalty calculation
   */
  getLoanWithPenalty(loanId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/loan/${loanId}/with-penalty`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Calculate total amount due for redemption (principal + interest + penalty)
   */
  calculateRedemptionAmount(loan: Loan, currentDate: Date = new Date()): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/calculate-redemption`, {
      loanId: loan.id,
      currentDate: currentDate.toISOString()
    }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get transaction history for a specific loan
   */
  getLoanTransactionHistory(loanId: string): Observable<LoanTransaction[]> {
    return this.http.get<LoanTransaction[]>(`${this.apiUrl}/loan/${loanId}/history`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Validate transaction before processing
   */
  validateTransaction(transactionType: TransactionType, loanId: string, amount?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, {
      transactionType,
      loanId,
      amount
    }, {
      headers: this.getHeaders()
    });
  }
}
