import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TransactionReportData {
  id: number;
  transaction_number: string;
  loan_number: string;
  transaction_type: string;
  status: string;
  principal_amount: number;
  interest_amount: number;
  total_service_charge: number;
  total_penalty: number;
  total_amount: number;
  transaction_date: string;
  maturity_date: string;
  pawner_first_name: string;
  pawner_last_name: string;
  customer_code: string;
  pawner_mobile: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_username: string;
  employee_role: string;
}

export interface TransactionSummaryData {
  transaction_type: string;
  count: number;
  total_principal: number;
  total_interest: number;
  total_service_charge: number;
  total_penalty: number;
  total_amount: number;
}

export interface AuctionSalesData {
  count: number;
  total_amount: number;
  sale_date: string;
}

export interface RevenueData {
  date: string;
  total_transactions: number;
  interest_revenue: number;
  service_charge_revenue: number;
  penalty_revenue: number;
  total_revenue: number;
}

export interface CategoryData {
  category: string;
  item_count: number;
  transaction_count: number;
  total_appraised_value: number;
  total_loan_amount: number;
  avg_appraised_value: number;
  avg_loan_amount: number;
}

export interface VoucherData {
  voucher_type: string;
  date: string;
  count: number;
  total_amount: number;
  avg_amount: number;
  vouchers: any[];
}

export interface ExpiredItemData {
  id: number;
  ticket_number: string;
  category: string;
  description: string;
  appraised_value: number;
  status: string;
  auction_price: number;
  maturity_date: string;
  expiry_date: string;
  days_expired: number;
  first_name: string;
  last_name: string;
  contact_number: string;
}

export interface ExpiredItemSummary {
  status: string;
  count: number;
  total_appraised_value: number;
  total_auction_price: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly API_URL = 'http://localhost:3000/api';
  private apiUrl = `${this.API_URL}/reports`;

  constructor(private http: HttpClient) {}

  /**
   * Get transaction report
   */
  async getTransactionReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.http.get<any>(`${this.apiUrl}/transactions`, { params }).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching transaction report:', error);
      throw error;
    }
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.http.get<any>(`${this.apiUrl}/revenue`, { params }).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      throw error;
    }
  }

  /**
   * Get category report
   */
  async getCategoryReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.http.get<any>(`${this.apiUrl}/categories`, { params }).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching category report:', error);
      throw error;
    }
  }

  /**
   * Get voucher report
   */
  async getVoucherReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.http.get<any>(`${this.apiUrl}/vouchers`, { params }).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching voucher report:', error);
      throw error;
    }
  }

  /**
   * Get expired items report
   */
  async getExpiredItemsReport(): Promise<any> {
    try {
      const response = await this.http.get<any>(`${this.apiUrl}/expired-items`).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching expired items report:', error);
      throw error;
    }
  }

  /**
   * Get cash position report for a specific date
   */
  async getCashPositionReport(date: string): Promise<any> {
    try {
      const response = await this.http.get<any>(`${this.apiUrl}/cash-position`, {
        params: { date }
      }).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching cash position report:', error);
      throw error;
    }
  }
}
