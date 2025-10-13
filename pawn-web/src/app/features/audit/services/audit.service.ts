import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  table_name: string | null;
  record_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditTrail {
  id: number;
  transaction_id: number | null;
  loan_number: string | null;
  user_id: number | null;
  username: string | null;
  action_type: string;
  description: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  amount: number | null;
  status_before: string | null;
  status_after: string | null;
  branch_id: number | null;
  branch_name?: string;
  ip_address: string | null;
  created_at: string;
  created_by: number | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    logs?: T[];
    trails?: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalRecords: number;
      pageSize: number;
    };
  };
}

export interface AuditStats {
  totalLogs: number;
  totalTrails: number;
  todayLogs: number;
  todayTrails: number;
  topActions: { action: string; count: number }[];
  topUsers: { username: string; count: number }[];
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: string;
  action_type?: string;
  user_id?: number;
  table_name?: string;
  transaction_id?: number;
  loan_number?: string;
  branch_id?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit`;

  // Audit Logs
  getAuditLogs(filters: AuditFilters = {}): Observable<PaginatedResponse<AuditLog>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<PaginatedResponse<AuditLog>>(`${this.apiUrl}/logs`, { params });
  }

  getAuditLogActions(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/logs/actions`);
  }

  getAuditLogTables(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/logs/tables`);
  }

  // Audit Trails
  getAuditTrails(filters: AuditFilters = {}): Observable<PaginatedResponse<AuditTrail>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<PaginatedResponse<AuditTrail>>(`${this.apiUrl}/trails`, { params });
  }

  getAuditTrailActionTypes(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/trails/action-types`);
  }

  getTransactionAuditTrail(transactionId: number): Observable<{ success: boolean; data: AuditTrail[] }> {
    return this.http.get<{ success: boolean; data: AuditTrail[] }>(`${this.apiUrl}/trails/transaction/${transactionId}`);
  }

  // Statistics
  getAuditStats(): Observable<{ success: boolean; data: AuditStats }> {
    return this.http.get<{ success: boolean; data: AuditStats }>(`${this.apiUrl}/stats`);
  }
}
