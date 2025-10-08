import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LoanInvoiceData {
  transactionType: 'new_loan' | 'redemption' | 'renewal' | 'partial_payment';
  transactionNumber: string;
  ticketNumber?: string;
  transactionDate: Date;
  pawnerName: string;
  pawnerContact: string;
  pawnerAddress: string;
  items: Array<{
    category: string;
    description: string;
    appraisedValue: number;
  }>;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  serviceCharge: number;
  netProceeds?: number; // For new loans
  totalAmount: number;
  // Payment details (for redemption, renewal, partial_payment)
  paymentAmount?: number;
  previousBalance?: number;
  remainingBalance?: number;
  // Dates
  loanDate?: Date;
  maturityDate: Date;
  expiryDate: Date;
  branchName?: string;
  cashierName?: string;
  notes?: string;
}

@Component({
  selector: 'app-loan-invoice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invoice-container" #invoiceContent>
      <!-- Invoice Header -->
      <div class="invoice-header">
        <div class="company-info">
          <h1 class="company-name">GoldWin Pawnshop</h1>
          <p class="company-address">123 Main Street, City, Philippines</p>
          <p class="company-contact">Tel: (123) 456-7890 | Email: info@goldwinpawnshop.com</p>
        </div>
        <div class="invoice-title">
          <h2>PAWN TICKET</h2>
          <p class="ticket-number">{{ invoiceData.ticketNumber || invoiceData.transactionNumber }}</p>
          <p *ngIf="invoiceData.transactionNumber && invoiceData.transactionNumber !== 'N/A'" style="font-size: 12px; color: #666; margin-top: 4px;">
            Ref: {{ invoiceData.transactionNumber }}
          </p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Transaction Info -->
      <div class="transaction-info">
        <div class="info-row">
          <div class="info-col">
            <span class="label">Date:</span>
            <span class="value">{{ formatDate(invoiceData.transactionDate) }}</span>
          </div>
          <div class="info-col">
            <span class="label">Branch:</span>
            <span class="value">{{ invoiceData.branchName || 'Main Branch' }}</span>
          </div>
        </div>
      </div>

      <!-- Pawner Information -->
      <div class="section">
        <h3 class="section-title">PAWNER INFORMATION</h3>
        <div class="pawner-info">
          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">{{ invoiceData.pawnerName }}</span>
          </div>
          <div class="info-row">
            <span class="label">Contact:</span>
            <span class="value">{{ invoiceData.pawnerContact }}</span>
          </div>
          <div class="info-row">
            <span class="label">Address:</span>
            <span class="value">{{ invoiceData.pawnerAddress }}</span>
          </div>
        </div>
      </div>

      <!-- Items Section -->
      <div class="section">
        <h3 class="section-title">PAWNED ITEMS</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Category</th>
              <th>Description</th>
              <th>Appraised Value</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of invoiceData.items; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ item.category }}</td>
              <td>{{ item.description }}</td>
              <td class="amount">{{ formatCurrency(item.appraisedValue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Financial Details -->
      <div class="section">
        <h3 class="section-title">LOAN DETAILS</h3>
        <table class="details-table">
          <tr>
            <td class="label">Principal Amount:</td>
            <td class="amount">{{ formatCurrency(invoiceData.principalAmount) }}</td>
          </tr>
          <tr>
            <td class="label">Interest Rate:</td>
            <td class="amount">{{ invoiceData.interestRate }}% monthly</td>
          </tr>
          <tr>
            <td class="label">Interest Amount:</td>
            <td class="amount">{{ formatCurrency(invoiceData.interestAmount) }}</td>
          </tr>
          <tr>
            <td class="label">Service Charge:</td>
            <td class="amount">{{ formatCurrency(invoiceData.serviceCharge) }}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Net Proceeds:</td>
            <td class="amount">{{ formatCurrency(invoiceData.netProceeds) }}</td>
          </tr>
          <tr class="total-row highlight">
            <td class="label">Total Amount Due:</td>
            <td class="amount">{{ formatCurrency(invoiceData.totalAmount) }}</td>
          </tr>
        </table>
      </div>

      <!-- Important Dates -->
      <div class="section">
        <h3 class="section-title">IMPORTANT DATES</h3>
        <div class="dates-info">
          <div class="date-box">
            <span class="date-label">Maturity Date:</span>
            <span class="date-value">{{ formatDate(invoiceData.maturityDate) }}</span>
          </div>
          <div class="date-box">
            <span class="date-label">Expiry Date:</span>
            <span class="date-value">{{ formatDate(invoiceData.expiryDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Terms and Conditions -->
      <div class="section terms">
        <h3 class="section-title">TERMS AND CONDITIONS</h3>
        <ul class="terms-list">
          <li>This pawn ticket must be presented upon redemption.</li>
          <li>Interest is computed monthly and must be paid on or before maturity date.</li>
          <li>A grace period of 1 month is given after maturity date.</li>
          <li>Items not redeemed within the expiry date will be subject to auction.</li>
          <li>Lost pawn tickets must be reported immediately and affidavit of loss is required.</li>
        </ul>
      </div>

      <!-- Footer -->
      <div class="invoice-footer">
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p class="signature-label">Pawner's Signature</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p class="signature-label">Cashier: {{ invoiceData.cashierName }}</p>
          </div>
        </div>
        <div class="footer-note">
          <p>This is a computer-generated document. Please keep this ticket for your records.</p>
          <p class="print-date">Printed: {{ getCurrentDateTime() }}</p>
        </div>
      </div>
    </div>

    <!-- Action Buttons (not printed) -->
    <div class="action-buttons no-print">
      <button (click)="onPrint()" class="btn btn-primary">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        Print Invoice
      </button>
      <button (click)="onSavePDF()" class="btn btn-secondary">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Save as PDF
      </button>
      <button #closeButton (click)="onClose()" class="btn btn-outline">
        Close
      </button>
    </div>
  `,
  styles: [`
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: white;
      font-family: 'Arial', sans-serif;
      color: #333;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 30px;
    }

    .company-info {
      flex: 1;
    }

    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #1a56db;
      margin: 0 0 8px 0;
    }

    .company-address, .company-contact {
      font-size: 12px;
      color: #666;
      margin: 4px 0;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h2 {
      font-size: 28px;
      font-weight: bold;
      color: #1a56db;
      margin: 0 0 8px 0;
    }

    .ticket-number {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }

    .divider {
      border-bottom: 3px solid #1a56db;
      margin: 20px 0;
    }

    .transaction-info {
      margin-bottom: 20px;
    }

    .section {
      margin-bottom: 25px;
    }

    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1a56db;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }

    .info-row {
      display: flex;
      gap: 30px;
      margin-bottom: 8px;
    }

    .info-col {
      flex: 1;
    }

    .label {
      font-weight: bold;
      color: #666;
      margin-right: 8px;
    }

    .value {
      color: #333;
    }

    .pawner-info .info-row {
      display: block;
      margin-bottom: 10px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .items-table th {
      background-color: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-size: 12px;
      font-weight: bold;
      border: 1px solid #e5e7eb;
    }

    .items-table td {
      padding: 10px;
      border: 1px solid #e5e7eb;
      font-size: 12px;
    }

    .items-table .amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }

    .details-table {
      width: 100%;
      margin-top: 10px;
    }

    .details-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .details-table td {
      padding: 10px 0;
      font-size: 13px;
    }

    .details-table .label {
      width: 60%;
      font-weight: normal;
    }

    .details-table .amount {
      width: 40%;
      text-align: right;
      font-family: 'Courier New', monospace;
      font-weight: bold;
    }

    .total-row {
      font-weight: bold;
    }

    .total-row.highlight {
      background-color: #fef3c7;
    }

    .total-row.highlight td {
      padding: 12px 0;
      font-size: 16px;
      color: #92400e;
    }

    .dates-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .date-box {
      padding: 15px;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      text-align: center;
    }

    .date-label {
      display: block;
      font-size: 11px;
      color: #666;
      margin-bottom: 5px;
      text-transform: uppercase;
      font-weight: bold;
    }

    .date-value {
      display: block;
      font-size: 16px;
      color: #1a56db;
      font-weight: bold;
    }

    .terms {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 6px;
    }

    .terms-list {
      margin: 10px 0 0 20px;
      padding: 0;
      font-size: 11px;
      line-height: 1.6;
      color: #666;
    }

    .terms-list li {
      margin-bottom: 6px;
    }

    .invoice-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .signature-box {
      flex: 1;
      text-align: center;
    }

    .signature-line {
      width: 200px;
      height: 40px;
      border-bottom: 1px solid #333;
      margin: 0 auto 8px;
    }

    .signature-label {
      font-size: 11px;
      color: #666;
    }

    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #999;
    }

    .print-date {
      margin-top: 5px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      display: flex;
      align-items: center;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 14px;
    }

    .btn-primary {
      background-color: #1a56db;
      color: white;
    }

    .btn-primary:hover {
      background-color: #1e40af;
    }

    .btn-secondary {
      background-color: #059669;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #047857;
    }

    .btn-outline {
      background-color: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-outline:hover {
      background-color: #f9fafb;
    }

    .btn svg {
      width: 20px;
      height: 20px;
    }

    @media print {
      .invoice-container {
        padding: 20px;
      }

      .no-print {
        display: none !important;
      }

      .action-buttons {
        display: none !important;
      }
    }
  `]
})
export class LoanInvoiceComponent implements OnInit, AfterViewInit {
  @Input() invoiceData!: LoanInvoiceData;
  @Output() closeInvoice = new EventEmitter<void>();
  @ViewChild('closeButton') closeButton!: ElementRef<HTMLButtonElement>;

  ngOnInit(): void {
    console.log('Invoice data:', this.invoiceData);
  }

  ngAfterViewInit(): void {
    // Focus on the close button when the modal opens
    setTimeout(() => {
      if (this.closeButton && this.closeButton.nativeElement) {
        this.closeButton.nativeElement.focus();
      }
    }, 100);
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  formatDate(date: Date | undefined | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onPrint(): void {
    window.print();
  }

  onSavePDF(): void {
    // Trigger print dialog - user can choose "Save as PDF" as destination
    // This works in all modern browsers without additional libraries
    window.print();
  }

  onClose(): void {
    this.closeInvoice.emit();
  }
}
