import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Voucher {
  id?: number;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt?: Date;
  createdBy?: string;
}

@Component({
  selector: 'app-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vouchers.html',
  styleUrl: './vouchers.css'
})
export class VouchersComponent implements OnInit {
  vouchers: Voucher[] = [];
  showModal = false;
  isEditing = false;
  
  voucherForm: Voucher = {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minPurchaseAmount: 0,
    maxDiscountAmount: 0,
    validFrom: '',
    validUntil: '',
    usageLimit: 1,
    usedCount: 0,
    isActive: true
  };

  ngOnInit(): void {
    this.loadVouchers();
  }

  loadVouchers(): void {
    // Mock data - replace with API call
    this.vouchers = [
      {
        id: 1,
        code: 'WELCOME2025',
        description: 'Welcome discount for new customers',
        discountType: 'percentage',
        discountValue: 10,
        minPurchaseAmount: 1000,
        maxDiscountAmount: 500,
        validFrom: '2025-01-01',
        validUntil: '2025-12-31',
        usageLimit: 100,
        usedCount: 15,
        isActive: true,
        createdAt: new Date('2025-01-01'),
        createdBy: 'manager1'
      },
      {
        id: 2,
        code: 'SAVE500',
        description: 'Fixed ₱500 off on any transaction',
        discountType: 'fixed',
        discountValue: 500,
        minPurchaseAmount: 5000,
        validFrom: '2025-10-01',
        validUntil: '2025-10-31',
        usageLimit: 50,
        usedCount: 8,
        isActive: true,
        createdAt: new Date('2025-10-01'),
        createdBy: 'manager1'
      }
    ];
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(voucher: Voucher): void {
    this.isEditing = true;
    this.voucherForm = { ...voucher };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.voucherForm = {
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      validFrom: '',
      validUntil: '',
      usageLimit: 1,
      usedCount: 0,
      isActive: true
    };
  }

  generateVoucherCode(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.voucherForm.code = code;
  }

  saveVoucher(): void {
    if (!this.validateForm()) {
      return;
    }

    if (this.isEditing) {
      // Update existing voucher
      const index = this.vouchers.findIndex(v => v.id === this.voucherForm.id);
      if (index !== -1) {
        this.vouchers[index] = { ...this.voucherForm };
      }
      console.log('Voucher updated:', this.voucherForm);
    } else {
      // Create new voucher
      const newVoucher: Voucher = {
        ...this.voucherForm,
        id: this.vouchers.length + 1,
        createdAt: new Date(),
        createdBy: 'manager1' // Replace with actual user
      };
      this.vouchers.unshift(newVoucher);
      console.log('New voucher created:', newVoucher);
    }

    // TODO: Make API call to save voucher
    // this.voucherService.saveVoucher(this.voucherForm).subscribe(...)

    this.closeModal();
  }

  validateForm(): boolean {
    if (!this.voucherForm.code || this.voucherForm.code.length < 4) {
      alert('Voucher code must be at least 4 characters');
      return false;
    }

    if (!this.voucherForm.description) {
      alert('Description is required');
      return false;
    }

    if (this.voucherForm.discountValue <= 0) {
      alert('Discount value must be greater than 0');
      return false;
    }

    if (this.voucherForm.discountType === 'percentage' && this.voucherForm.discountValue > 100) {
      alert('Percentage discount cannot exceed 100%');
      return false;
    }

    if (!this.voucherForm.validFrom || !this.voucherForm.validUntil) {
      alert('Valid from and until dates are required');
      return false;
    }

    if (new Date(this.voucherForm.validFrom) >= new Date(this.voucherForm.validUntil)) {
      alert('Valid until date must be after valid from date');
      return false;
    }

    return true;
  }

  toggleVoucherStatus(voucher: Voucher): void {
    voucher.isActive = !voucher.isActive;
    console.log('Voucher status toggled:', voucher);
    // TODO: Make API call to update status
  }

  deleteVoucher(voucher: Voucher): void {
    if (confirm(`Are you sure you want to delete voucher "${voucher.code}"?`)) {
      this.vouchers = this.vouchers.filter(v => v.id !== voucher.id);
      console.log('Voucher deleted:', voucher);
      // TODO: Make API call to delete voucher
    }
  }

  getDiscountDisplay(voucher: Voucher): string {
    if (voucher.discountType === 'percentage') {
      return `${voucher.discountValue}% OFF`;
    } else {
      return `₱${voucher.discountValue.toLocaleString()} OFF`;
    }
  }

  getUsagePercentage(voucher: Voucher): number {
    return (voucher.usedCount / voucher.usageLimit) * 100;
  }

  isExpired(voucher: Voucher): boolean {
    return new Date(voucher.validUntil) < new Date();
  }

  isUpcoming(voucher: Voucher): boolean {
    return new Date(voucher.validFrom) > new Date();
  }
}
