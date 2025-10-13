import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, AuditLog, AuditTrail, AuditFilters, AuditStats } from '../services/audit.service';

@Component({
  selector: 'app-audit-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-viewer.component.html'
})
export class AuditViewerComponent implements OnInit {
  private auditService = inject(AuditService);

  // Expose Math to template
  Math = Math;

  activeTab: 'dashboard' | 'logs' | 'trails' = 'dashboard';
  isLoading = false;

  // Dashboard
  stats: AuditStats | null = null;

  // Audit Logs
  auditLogs: AuditLog[] = [];
  logsPagination = { currentPage: 1, totalPages: 1, totalRecords: 0, pageSize: 50 };
  logsFilters: AuditFilters = { page: 1, limit: 50 };
  availableActions: string[] = [];
  availableTables: string[] = [];
  selectedLog: AuditLog | null = null;

  // Audit Trails
  auditTrails: AuditTrail[] = [];
  trailsPagination = { currentPage: 1, totalPages: 1, totalRecords: 0, pageSize: 50 };
  trailsFilters: AuditFilters = { 
    page: 1, 
    limit: 50,
    dateFrom: new Date().toISOString().split('T')[0], // Default to today
    dateTo: new Date().toISOString().split('T')[0]     // Default to today
  };
  availableActionTypes: string[] = [];
  selectedTrail: AuditTrail | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.loadAuditLogs();
    this.loadFilterOptions();
  }

  switchTab(tab: 'dashboard' | 'logs' | 'trails'): void {
    this.activeTab = tab;
    if (tab === 'logs' && this.auditLogs.length === 0) {
      this.loadAuditLogs();
    } else if (tab === 'trails' && this.auditTrails.length === 0) {
      this.loadAuditTrails();
    }
  }

  // Dashboard
  loadStats(): void {
    this.auditService.getAuditStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.data;
        }
      },
      error: (error) => console.error('Error loading stats:', error)
    });
  }

  // Audit Logs
  loadAuditLogs(): void {
    this.isLoading = true;
    this.auditService.getAuditLogs(this.logsFilters).subscribe({
      next: (response) => {
        if (response.success) {
          this.auditLogs = response.data.logs || [];
          this.logsPagination = response.data.pagination;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading audit logs:', error);
        this.isLoading = false;
      }
    });
  }

  applyLogsFilters(): void {
    this.logsFilters.page = 1;
    this.loadAuditLogs();
  }

  clearLogsFilters(): void {
    this.logsFilters = { page: 1, limit: 50 };
    this.loadAuditLogs();
  }

  changeLogsPage(page: number): void {
    this.logsFilters.page = page;
    this.loadAuditLogs();
  }

  viewLogDetails(log: AuditLog): void {
    this.selectedLog = log;
  }

  closeLogDetails(): void {
    this.selectedLog = null;
  }

  // Audit Trails
  loadAuditTrails(): void {
    this.isLoading = true;
    this.auditService.getAuditTrails(this.trailsFilters).subscribe({
      next: (response) => {
        if (response.success) {
          this.auditTrails = response.data.trails || [];
          this.trailsPagination = response.data.pagination;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading audit trails:', error);
        this.isLoading = false;
      }
    });
  }

  applyTrailsFilters(): void {
    this.trailsFilters.page = 1;
    this.loadAuditTrails();
  }

  clearTrailsFilters(): void {
    this.trailsFilters = { page: 1, limit: 50 };
    this.loadAuditTrails();
  }

  changeTrailsPage(page: number): void {
    this.trailsFilters.page = page;
    this.loadAuditTrails();
  }

  viewTrailDetails(trail: AuditTrail): void {
    this.selectedTrail = trail;
  }

  closeTrailDetails(): void {
    this.selectedTrail = null;
  }

  // Filter Options
  loadFilterOptions(): void {
    this.auditService.getAuditLogActions().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableActions = response.data;
        }
      }
    });

    this.auditService.getAuditLogTables().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableTables = response.data;
        }
      }
    });

    this.auditService.getAuditTrailActionTypes().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableActionTypes = response.data;
        }
      }
    });
  }

  // Utility Methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getActionBadgeClass(action: string): string {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'bg-green-100 text-green-800';
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'bg-blue-100 text-blue-800';
    if (actionLower.includes('delete')) return 'bg-red-100 text-red-800';
    if (actionLower.includes('login')) return 'bg-purple-100 text-purple-800';
    if (actionLower.includes('payment')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  }

  getPaginationRange(): number[] {
    const current = this.activeTab === 'logs' ? this.logsPagination.currentPage : this.trailsPagination.currentPage;
    const total = this.activeTab === 'logs' ? this.logsPagination.totalPages : this.trailsPagination.totalPages;
    const range: number[] = [];
    const delta = 2;

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift(-1);
    }
    if (current + delta < total - 1) {
      range.push(-1);
    }

    range.unshift(1);
    if (total > 1) {
      range.push(total);
    }

    return range;
  }

  hasOldValues(log: AuditLog): boolean {
    return log.old_values !== null && Object.keys(log.old_values).length > 0;
  }

  hasNewValues(log: AuditLog): boolean {
    return log.new_values !== null && Object.keys(log.new_values).length > 0;
  }

  hasOldData(trail: AuditTrail): boolean {
    return trail.old_data !== null && Object.keys(trail.old_data).length > 0;
  }

  hasNewData(trail: AuditTrail): boolean {
    return trail.new_data !== null && Object.keys(trail.new_data).length > 0;
  }

  getObjectKeys(obj: Record<string, unknown> | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
}
