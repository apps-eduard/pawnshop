import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionCalculationService } from '../../../core/services/transaction-calculation.service';

export interface CustomerInfo {
  contactNumber: string;
  firstName: string;
  lastName: string;
  city: string;
  barangay?: string;
  completeAddress?: string;
}

export interface TransactionInfo {
  transactionDate: string;
  grantedDate: string;
  maturedDate: string;
  gracePeriodDate?: string; // Maturity date + 3 days (redeem date)
  expiredDate: string;
}

export interface PawnedItem {
  categoryName?: string;
  category?: string;
  itemName?: string;
  description?: string;
  itemDescription?: string;
  descriptionName?: string; // Proper item description from descriptions table
  customDescription?: string; // User notes/remarks
  appraisedValue?: number;
  appraisalValue?: number;
  notes?: string;
  appraisalNotes?: string;
}

@Component({
  selector: 'app-transaction-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      <!-- Customer Information -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2">
          <div class="flex items-center justify-center">
            <h2 class="text-sm font-semibold text-white flex items-center absolute left-3">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              Customer Information
            </h2>

            <div class="relative max-w-xs">
              <input type="text" [(ngModel)]="searchTicketNumber" placeholder="Search Ticket Number"
                (keydown.enter)="onSearch()"
                (ngModelChange)="searchTicketNumberChange.emit($event)"
                class="w-full pl-4 pr-12 text-center py-2 bg-white/20 backdrop-blur-sm text-white placeholder-white/70 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 hover:bg-white/25">
              <button (click)="onSearch()" [disabled]="isLoading"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50">
                <svg *ngIf="!isLoading" class="w-4 h-4 text-white/80 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <svg *ngIf="isLoading" class="w-4 h-4 text-white/80 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="p-3">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
              <input type="text" [(ngModel)]="customerInfo.contactNumber"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input type="text" [(ngModel)]="customerInfo.firstName"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input type="text" [(ngModel)]="customerInfo.lastName"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input type="text" [(ngModel)]="customerInfo.city"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Barangay</label>
              <input type="text" [(ngModel)]="customerInfo.barangay"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Complete Address</label>
              <input type="text" [(ngModel)]="customerInfo.completeAddress"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction Information -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="bg-gradient-to-r from-green-600 to-green-700 px-3 py-2">
          <h2 class="text-sm font-semibold text-white flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Transaction Information
          </h2>
        </div>
        <div class="p-3">
          <div class="flex flex-wrap lg:flex-nowrap justify-between gap-3">
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Date</label>
              <input type="date" [(ngModel)]="transactionInfo.transactionDate"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Granted Date</label>
              <input type="date" [(ngModel)]="transactionInfo.grantedDate"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Matured Date</label>
              <input type="date" [(ngModel)]="transactionInfo.maturedDate"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">Redeem Date (Grace Period)</label>
              <input type="date" [(ngModel)]="transactionInfo.gracePeriodDate"
                class="w-full px-2 py-1 text-sm border-2 border-green-400 dark:border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300 font-semibold"
                readonly>
            </div>
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expired Date</label>
              <input type="date" [(ngModel)]="transactionInfo.expiredDate"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                readonly>
            </div>
            <div class="flex-1 min-w-[120px]">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <div class="flex items-center h-[33px]">
                <span [ngClass]="getLoanStatusClass()" class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getLoanStatus() }}
                </span>
              </div>
            </div>
            <div class="flex-1 min-w-[180px]">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
              <div class="flex items-center gap-1 h-[33px]" [ngClass]="getDurationAnimationClass()">
                <div class="flex items-center bg-gradient-to-r text-white px-1.5 py-0.5 rounded-md shadow-sm"
                     [ngClass]="'bg-gradient-to-r ' + getDurationBadgeColors().years">
                  <span class="text-xs font-bold">{{ getYearsDifference() }}</span>
                  <span class="text-xs font-medium ml-0.5">Y</span>
                </div>
                <div class="flex items-center bg-gradient-to-r text-white px-1.5 py-0.5 rounded-md shadow-sm"
                     [ngClass]="'bg-gradient-to-r ' + getDurationBadgeColors().months">
                  <span class="text-xs font-bold">{{ getMonthsDifference() }}</span>
                  <span class="text-xs font-medium ml-0.5">M</span>
                </div>
                <div class="flex items-center bg-gradient-to-r text-white px-1.5 py-0.5 rounded-md shadow-sm"
                     [ngClass]="'bg-gradient-to-r ' + getDurationBadgeColors().days">
                  <span class="text-xs font-bold">{{ getDaysDifference() }}</span>
                  <span class="text-xs font-medium ml-0.5">D</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pawned Items -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-2">
          <h2 class="text-sm font-semibold text-white flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            Pawned Items
          </h2>
        </div>
        <div class="p-3">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Category</th>
                  <th class="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Description</th>
                  <th class="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Notes or Remarks</th>
                  <th class="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Appraisal Value</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of pawnedItems; let i = index"
                    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td class="py-2 px-2 text-gray-900 dark:text-gray-100">{{ item.categoryName || item.category || '-' }}</td>
                  <td class="py-2 px-2 text-gray-600 dark:text-gray-400">{{ item.descriptionName || item.description || item.itemDescription || '-' }}</td>
                  <td class="py-2 px-2 text-gray-600 dark:text-gray-400 max-w-xs">{{ item.appraisalNotes || 'No remarks' }}</td>
                  <td class="py-2 px-2 text-right font-medium text-green-600 dark:text-green-400">
                    ₱{{ (item.appraisedValue || item.appraisalValue || 0) | number:'1.2-2' }}
                  </td>
                </tr>
                <tr *ngIf="pawnedItems.length === 0">
                  <td colspan="4" class="py-4 text-center text-gray-500 dark:text-gray-400 italic">
                    No items found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TransactionInfoComponent implements OnChanges {
  constructor(private transactionCalcService: TransactionCalculationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactionInfo']) {
      console.log('🔄 TRANSACTION-INFO COMPONENT - transactionInfo changed:', this.transactionInfo);
      console.log('📅 REDEEM DATE in component:', this.transactionInfo.gracePeriodDate);
    }
  }

  @Input() customerInfo: CustomerInfo = {
    contactNumber: '',
    firstName: '',
    lastName: '',
    city: '',
    barangay: '',
    completeAddress: ''
  };

  @Input() transactionInfo: TransactionInfo = {
    transactionDate: '',
    grantedDate: '',
    maturedDate: '',
    expiredDate: ''
  };

  @Input() pawnedItems: PawnedItem[] = [];
  @Input() searchTicketNumber: string = '';
  @Input() isLoading: boolean = false;

  @Output() search = new EventEmitter<string>();
  @Output() searchTicketNumberChange = new EventEmitter<string>();

  onSearch(): void {
    console.log('Component onSearch called with:', this.searchTicketNumber);
    this.search.emit(this.searchTicketNumber);
  }

  // Use global transaction calculation service
  getLoanStatus(): string {
    return this.transactionCalcService.getLoanStatus(
      this.transactionInfo.maturedDate,
      this.transactionInfo.expiredDate
    );
  }

  getLoanStatusClass(): string {
    const status = this.getLoanStatus();
    return this.transactionCalcService.getStatusClass(status);
  }

  getDurationBadgeColors(): {years: string, months: string, days: string} {
    const status = this.getLoanStatus();
    return this.transactionCalcService.getDurationBadgeColors(status);
  }

  getDurationAnimationClass(): string {
    const status = this.getLoanStatus();
    return this.transactionCalcService.getDurationAnimationClass(status);
  }

  getYearsDifference(): number {
    const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
    return duration.years;
  }

  getMonthsDifference(): number {
    const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
    return duration.months;
  }

  getDaysDifference(): number {
    const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
    return duration.days;
  }
}
