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
  templateUrl: '../transaction/transaction-info.component.html'
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
    completeAddress: '',
  };

  @Input() transactionInfo: TransactionInfo = {
    transactionDate: '',
    grantedDate: '',
    maturedDate: '',
    expiredDate: '',
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

  getDurationBadgeColors(): { years: string; months: string; days: string } {
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
