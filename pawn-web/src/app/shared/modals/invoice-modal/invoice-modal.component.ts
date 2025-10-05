import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanInvoiceComponent, LoanInvoiceData } from '../../components/loan-invoice/loan-invoice.component';

@Component({
  selector: 'app-invoice-modal',
  standalone: true,
  imports: [CommonModule, LoanInvoiceComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <app-loan-invoice
          [invoiceData]="invoiceData"
          (closeInvoice)="onClose()">
        </app-loan-invoice>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.75);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      overflow-y: auto;
      padding: 20px;
    }

    .modal-container {
      position: relative;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    /* Scroll bar styling */
    .modal-container::-webkit-scrollbar {
      width: 8px;
    }

    .modal-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    .modal-container::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }

    .modal-container::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    @media print {
      .modal-backdrop {
        background-color: transparent;
        position: static;
        padding: 0;
      }

      .modal-container {
        max-width: none;
        max-height: none;
        box-shadow: none;
        overflow: visible;
      }
    }
  `]
})
export class InvoiceModalComponent {
  @Input() invoiceData!: LoanInvoiceData;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Close only if clicking directly on backdrop (not on modal content)
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
