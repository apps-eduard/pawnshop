import { Component, inject, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ModalService } from '../../services/modal.service';
import { AddressService } from '../../../core/services/address.service';
import { ToastService } from '../../../core/services/toast.service';
import { BarangayModalConfig, ModalResult, BarangayModalData } from '../../models/modal-interfaces';

@Component({
  selector: 'app-add-barangay-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 max-w-full mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config?.title || 'Add Barangay' }}</h3>
          </div>
          <button type="button" (click)="onCancel()" title="Close Modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Selected City Display -->
        <div class="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded border border-blue-200 dark:border-blue-700">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <div>
              <label class="text-xs font-medium text-blue-700 dark:text-blue-300">City</label>
              <p class="text-sm font-semibold text-blue-800 dark:text-blue-200">{{ config?.selectedCityName || 'No city selected' }}</p>
            </div>
          </div>
        </div>
        
        <!-- Form -->
        <div class="mb-4">
          <label for="barangayNameInput" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Barangay Name
          </label>
          <input 
            #barangayInput
            id="barangayNameInput" 
            type="text" 
            [(ngModel)]="barangayName" 
            [placeholder]="config?.placeholder || 'Enter barangay name...'"
            (keyup.enter)="onAdd()"
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all"
            [class.border-emerald-300]="barangayName && barangayName.trim()"
            [class.bg-emerald-50]="barangayName && barangayName.trim()"
            [class.dark:bg-emerald-900/10]="barangayName && barangayName.trim()">
        </div>
        
        <!-- Buttons -->
        <div class="flex justify-end gap-2">
          <button type="button" (click)="onCancel()"
            class="flex items-center px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded transition-all">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Cancel
          </button>
          <button type="button" (click)="onAdd()" [disabled]="!barangayName || !barangayName.trim() || isLoading"
            class="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded transition-all shadow-sm">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            {{ isLoading ? 'Adding...' : 'Add' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AddBarangayModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('barangayInput') barangayInput!: ElementRef<HTMLInputElement>;
  
  private modalService = inject(ModalService);
  private addressService = inject(AddressService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  isVisible = false;
  config: BarangayModalConfig | null = null;
  barangayName = '';
  isLoading = false;

  ngOnInit() {
    // Subscribe to modal visibility
    this.modalService.barangayModal$.pipe(takeUntil(this.destroy$)).subscribe(visible => {
      this.isVisible = visible;
      if (!visible) {
        this.barangayName = '';
        this.isLoading = false;
      } else {
        // Focus input when modal becomes visible
        setTimeout(() => this.focusInput(), 0);
      }
    });

    // Subscribe to modal configuration
    this.modalService.barangayModalConfig$.pipe(takeUntil(this.destroy$)).subscribe(config => {
      this.config = config;
    });
  }

  ngAfterViewInit() {
    // Focus input if modal is already visible
    if (this.isVisible) {
      this.focusInput();
    }
  }

  private focusInput() {
    if (this.barangayInput?.nativeElement) {
      this.barangayInput.nativeElement.focus();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancel() {
    const result: ModalResult = {
      success: false,
      action: 'cancel'
    };
    this.modalService.barangayModalResult(result);
  }

  onAdd() {
    if (!this.barangayName || !this.barangayName.trim()) {
      this.toastService.showWarning('Validation', 'Please enter a barangay name');
      return;
    }

    if (!this.config?.selectedCityId) {
      this.toastService.showWarning('Validation', 'Please select a city first');
      return;
    }

    this.isLoading = true;
    const barangayData = {
      name: this.barangayName.trim(),
      cityId: parseInt(this.config.selectedCityId),
      isActive: true
    };

    this.addressService.createBarangay(barangayData).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const result: ModalResult<BarangayModalData> = {
            success: true,
            data: {
              name: response.data.name,
              cityId: this.config!.selectedCityId,
              cityName: this.config!.selectedCityName
            },
            action: 'add'
          };
          
          this.toastService.showSuccess('Success', 'Barangay added successfully');
          this.modalService.barangayModalResult(result);
        } else {
          this.toastService.showError('Error', response.message || 'Failed to add barangay');
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        console.error('Error adding barangay:', error);
        
        let errorMessage = 'Failed to add barangay';
        
        if (error.status === 409) {
          errorMessage = 'A barangay with this name already exists in this city';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to add barangays (requires admin, manager, or cashier role)';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.toastService.showError('Error', errorMessage);
        this.isLoading = false;
      }
    });
  }
}