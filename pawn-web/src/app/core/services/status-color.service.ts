import { Injectable } from '@angular/core';

/**
 * Centralized Status and Transaction Type Color Service
 * 
 * This service provides consistent color schemes for transaction statuses and types
 * across the entire application. Change colors here and they update everywhere.
 * 
 * Usage:
 * 1. Inject this service: constructor(public colorService: StatusColorService) {}
 * 2. Get status color: colorService.getStatusColor('active')
 * 3. Get type color: colorService.getTransactionTypeColor('new_loan')
 */
@Injectable({
  providedIn: 'root'
})
export class StatusColorService {

  // ==========================================
  // TRANSACTION STATUS COLORS
  // ==========================================
  
  private readonly statusColors: { [key: string]: string } = {
    // Active/Current Statuses (Blue)
    'active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    'pending': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    
    // Matured/Overdue Statuses (Yellow/Orange)
    'matured': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    'overdue': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800',
    'late': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800',
    
    // Success/Completed Statuses (Green)
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    'redeemed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    'success': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    'paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    
    // Expired/Failed Statuses (Red)
    'expired': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    'void': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    
    // Auction/Final Statuses (Purple)
    'auctioned': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    'sold': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    
    // Renewed/Modified Statuses (Indigo)
    'renewed': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
    'extended': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
    
    // Inactive/Disabled Statuses (Gray)
    'inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    'archived': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    
    // Item Statuses
    'in_vault': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    'released': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    'lost': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    
    // Default
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
  };

  // ==========================================
  // TRANSACTION TYPE COLORS
  // ==========================================
  
  private readonly transactionTypeColors: { [key: string]: string } = {
    // New Loan (Primary Blue)
    'new_loan': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    'loan': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    
    // Redemption (Green)
    'redemption': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    'redeem': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    
    // Renewal (Indigo)
    'renewal': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
    'renew': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
    
    // Partial Payment (Cyan)
    'partial_payment': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800',
    'partial': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800',
    
    // Additional Loan (Purple)
    'additional_loan': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    'additional': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    
    // Payment (Emerald)
    'payment': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    'pay': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    
    // Auction (Amber)
    'auction': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    'auctioned': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    
    // Default
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
  };

  // ==========================================
  // TRANSACTION TYPE LABELS
  // ==========================================
  
  private readonly transactionTypeLabels: { [key: string]: string } = {
    'new_loan': 'New Loan',
    'loan': 'Loan',
    'redemption': 'Redemption',
    'redeem': 'Redeem',
    'renewal': 'Renewal',
    'renew': 'Renew',
    'partial_payment': 'Partial Payment',
    'partial': 'Partial',
    'additional_loan': 'Additional Loan',
    'additional': 'Additional',
    'payment': 'Payment',
    'pay': 'Payment',
    'auction': 'Auction',
    'auctioned': 'Auctioned'
  };

  constructor() { }

  /**
   * Get Tailwind CSS classes for a transaction status
   * @param status - Status string (e.g., 'active', 'redeemed', 'expired')
   * @returns Tailwind CSS class string
   */
  getStatusColor(status: string | null | undefined): string {
    if (!status) return this.statusColors['default'];
    const normalizedStatus = status.toLowerCase().trim();
    return this.statusColors[normalizedStatus] || this.statusColors['default'];
  }

  /**
   * Get Tailwind CSS classes for a transaction type
   * @param type - Transaction type string (e.g., 'new_loan', 'redemption', 'renewal')
   * @returns Tailwind CSS class string
   */
  getTransactionTypeColor(type: string | null | undefined): string {
    if (!type) return this.transactionTypeColors['default'];
    const normalizedType = type.toLowerCase().trim();
    return this.transactionTypeColors[normalizedType] || this.transactionTypeColors['default'];
  }

  /**
   * Get human-readable label for a transaction type
   * @param type - Transaction type string (e.g., 'new_loan' -> 'New Loan')
   * @returns Human-readable label
   */
  getTransactionTypeLabel(type: string | null | undefined): string {
    if (!type) return 'Unknown';
    const normalizedType = type.toLowerCase().trim();
    return this.transactionTypeLabels[normalizedType] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get status label with proper capitalization
   * @param status - Status string (e.g., 'active' -> 'Active')
   * @returns Formatted status label
   */
  getStatusLabel(status: string | null | undefined): string {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Check if a status is considered "active" (can be processed)
   * @param status - Status string
   * @returns True if status is active or matured
   */
  isActiveStatus(status: string | null | undefined): boolean {
    if (!status) return false;
    const activeStatuses = ['active', 'matured', 'pending', 'in_progress'];
    return activeStatuses.includes(status.toLowerCase().trim());
  }

  /**
   * Check if a status is considered "completed" (finished)
   * @param status - Status string
   * @returns True if status is completed/redeemed/paid
   */
  isCompletedStatus(status: string | null | undefined): boolean {
    if (!status) return false;
    const completedStatuses = ['completed', 'redeemed', 'paid', 'success', 'approved'];
    return completedStatuses.includes(status.toLowerCase().trim());
  }

  /**
   * Check if a status is considered "failed" (negative outcome)
   * @param status - Status string
   * @returns True if status is failed/expired/cancelled
   */
  isFailedStatus(status: string | null | undefined): boolean {
    if (!status) return false;
    const failedStatuses = ['expired', 'cancelled', 'rejected', 'failed', 'void'];
    return failedStatuses.includes(status.toLowerCase().trim());
  }

  /**
   * Get all available statuses with their colors (for documentation/testing)
   * @returns Object with status -> color mapping
   */
  getAllStatusColors(): { [key: string]: string } {
    return { ...this.statusColors };
  }

  /**
   * Get all available transaction types with their colors (for documentation/testing)
   * @returns Object with type -> color mapping
   */
  getAllTransactionTypeColors(): { [key: string]: string } {
    return { ...this.transactionTypeColors };
  }
}
