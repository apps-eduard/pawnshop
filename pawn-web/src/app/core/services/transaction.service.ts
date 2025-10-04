import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  id: string;
  transaction_number: string;
  type: 'new_loan' | 'payment' | 'renewal' | 'redemption';
  customer_name: string;
  pawner_name: string;
  amount: number;
  principal_amount: number;
  status: 'completed' | 'pending' | 'failed' | 'active';
  created_at: Date;
  loan_date: Date;
  maturity_date: Date;
  expiry_date: Date;
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
}
