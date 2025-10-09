import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TransactionStatistics {
  count: number;
  totalAmount: number;
}

export interface DailyStatistics {
  auctionSales: TransactionStatistics;
  redeem: TransactionStatistics;
  renew: TransactionStatistics;
  partial: TransactionStatistics;
  additional: TransactionStatistics;
  newLoan: TransactionStatistics;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly API_URL = 'http://localhost:3000/api';
  private statisticsUrl = `${this.API_URL}/statistics`;

  constructor(private http: HttpClient) {}

  async getTodayStatistics(): Promise<ApiResponse<DailyStatistics>> {
    try {
      const response = await this.http.get<ApiResponse<DailyStatistics>>(`${this.statisticsUrl}/today`).toPromise();
      return response || { success: false, message: 'No response', data: {
        auctionSales: { count: 0, totalAmount: 0 },
        redeem: { count: 0, totalAmount: 0 },
        renew: { count: 0, totalAmount: 0 },
        partial: { count: 0, totalAmount: 0 },
        additional: { count: 0, totalAmount: 0 },
        newLoan: { count: 0, totalAmount: 0 }
      }};
    } catch (error: any) {
      console.error('Error fetching today statistics:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to fetch statistics',
        data: {
          auctionSales: { count: 0, totalAmount: 0 },
          redeem: { count: 0, totalAmount: 0 },
          renew: { count: 0, totalAmount: 0 },
          partial: { count: 0, totalAmount: 0 },
          additional: { count: 0, totalAmount: 0 },
          newLoan: { count: 0, totalAmount: 0 }
        }
      };
    }
  }
}
