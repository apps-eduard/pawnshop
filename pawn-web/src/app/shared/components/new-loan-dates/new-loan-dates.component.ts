import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NewLoanDates {
  newMaturityDate?: string;
  newGracePeriodDate?: string;
  newExpiryDate?: string;
}

@Component({
  selector: 'app-new-loan-dates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './new-loan-dates.component.html',
  styleUrls: ['./new-loan-dates.component.css']
})
export class NewLoanDatesComponent {
  @Input() dates?: NewLoanDates;
  @Input() showCondition: boolean = false;
}
