import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Voucher {
  id: number;
  voucher_type: 'cash' | 'cheque';
  transaction_type: 'cash_in' | 'cash_out';
  voucher_date: string;
  amount: number;
  notes: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_username?: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
}

export interface VoucherForm {
  type: 'cash' | 'cheque';
  transactionType: 'cash_in' | 'cash_out';
  date: string;
  amount: number;
  notes: string;
}

export interface VoucherListResponse {
  success: boolean;
  data: Voucher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VoucherResponse {
  success: boolean;
  message: string;
  data: Voucher | Voucher[];
}

export interface VoucherStats {
  total_vouchers: number;
  total_amount: number;
  total_cash: number;
  total_cheque: number;
  cash_count: number;
  cheque_count: number;
}

export interface VoucherStatsResponse {
  success: boolean;
  data: VoucherStats;
}

@Injectable({
  providedIn: 'root'
})
export class VoucherService {
  private readonly API_URL = environment.apiUrl;
  private vouchersUrl = `${this.API_URL}/vouchers`;

  constructor(private http: HttpClient) {}

  /**
   * Get all vouchers with optional filtering
   */
  getVouchers(
    page: number = 1,
    limit: number = 50,
    filters?: {
      type?: 'cash' | 'cheque';
      startDate?: string;
      endDate?: string;
      createdBy?: number;
    }
  ): Observable<VoucherListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.createdBy) params = params.set('createdBy', filters.createdBy.toString());
    }

    return this.http.get<VoucherListResponse>(this.vouchersUrl, { params });
  }

  /**
   * Get a specific voucher by ID
   */
  getVoucherById(id: number): Observable<VoucherResponse> {
    return this.http.get<VoucherResponse>(`${this.vouchersUrl}/${id}`);
  }

  /**
   * Create a single voucher
   */
  createVoucher(voucher: VoucherForm): Observable<VoucherResponse> {
    return this.http.post<VoucherResponse>(this.vouchersUrl, voucher);
  }

  /**
   * Create multiple vouchers at once
   */
  createVouchersBatch(vouchers: VoucherForm[]): Observable<VoucherResponse> {
    return this.http.post<VoucherResponse>(`${this.vouchersUrl}/batch`, { vouchers });
  }

  /**
   * Delete a voucher by ID
   */
  deleteVoucher(id: number): Observable<VoucherResponse> {
    return this.http.delete<VoucherResponse>(`${this.vouchersUrl}/${id}`);
  }

  /**
   * Get voucher statistics
   */
  getVoucherStats(startDate?: string, endDate?: string): Observable<VoucherStatsResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<VoucherStatsResponse>(`${this.vouchersUrl}/stats/summary`, { params });
  }

  /**
   * Format voucher type for display
   */
  formatVoucherType(type: 'cash' | 'cheque'): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Get color class for voucher type
   */
  getVoucherTypeColor(type: 'cash' | 'cheque'): string {
    return type === 'cash'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }
}
