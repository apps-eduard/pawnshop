import { Component, inject, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ModalService } from '../../services/modal.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoryDescriptionModalConfig, ModalResult, CategoryDescriptionModalData } from '../../models/modal-interfaces';

@Component({
  selector: 'app-add-category-description-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 max-w-full mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config?.title || 'Add Description' }}</h3>
          </div>
          <button type="button" (click)="onCancel()" title="Close Modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Selected Category Display -->
        <div class="mb-2 p-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded border border-emerald-200 dark:border-emerald-700">
          <div class="flex items-center">
            <svg class="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            <div>
              <label class="text-xs font-medium text-emerald-700 dark:text-emerald-300">Category</label>
              <p class="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{{ config?.selectedCategoryName || 'No category selected' }}</p>
            </div>
          </div>
        </div>
        
        <!-- Form -->
        <div class="mb-3">
          <label for="descriptionInput" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea 
            #descriptionInput
            id="descriptionInput" 
            [(ngModel)]="description" 
            [placeholder]="config?.placeholder || 'Enter description...'" 
            rows="2"
            class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all resize-none"
            [class.border-emerald-300]="description && description.trim()"
            [class.bg-emerald-50]="description && description.trim()"
            [class.dark:bg-emerald-900/10]="description && description.trim()">
          </textarea>
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
          <button type="button" (click)="onAdd()" [disabled]="!description || !description.trim() || isLoading"
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
export class AddCategoryDescriptionModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('descriptionInput') descriptionInput!: ElementRef<HTMLTextAreaElement>;
  
  private modalService = inject(ModalService);
  private categoriesService = inject(CategoriesService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  isVisible = false;
  config: CategoryDescriptionModalConfig | null = null;
  description = '';
  isLoading = false;

  ngOnInit() {
    // Subscribe to modal visibility
    this.modalService.categoryDescriptionModal$.pipe(takeUntil(this.destroy$)).subscribe(visible => {
      this.isVisible = visible;
      if (!visible) {
        this.description = '';
        this.isLoading = false;
      } else {
        // Focus input when modal becomes visible
        setTimeout(() => this.focusInput(), 0);
      }
    });

    // Subscribe to modal configuration
    this.modalService.categoryDescriptionModalConfig$.pipe(takeUntil(this.destroy$)).subscribe(config => {
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
    if (this.descriptionInput?.nativeElement) {
      this.descriptionInput.nativeElement.focus();
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
    this.modalService.categoryDescriptionModalResult(result);
  }

  onAdd() {
    if (!this.description || !this.description.trim()) {
      this.toastService.showWarning('Validation', 'Please enter a description');
      return;
    }

    if (!this.config?.selectedCategoryId) {
      this.toastService.showWarning('Validation', 'Please select a category first');
      return;
    }

    this.isLoading = true;
    const descriptionData = {
      description: this.description.trim()
    };

    this.categoriesService.createCategoryDescription(parseInt(this.config.selectedCategoryId), descriptionData).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const result: ModalResult<CategoryDescriptionModalData> = {
            success: true,
            data: {
              description: response.data.name,
              categoryId: this.config!.selectedCategoryId,
              categoryName: this.config!.selectedCategoryName
            },
            action: 'add'
          };
          
          this.toastService.showSuccess('Success', `Description added to "${this.config!.selectedCategoryName}" successfully`);
          this.modalService.categoryDescriptionModalResult(result);
        } else {
          this.toastService.showError('Error', response.message || 'Failed to add description');
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        console.error('Error adding category description:', error);
        
        let errorMessage = 'Failed to add category description';
        
        if (error.status === 409) {
          errorMessage = 'This description already exists for this category';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to add category descriptions (requires admin, manager, or cashier role)';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.toastService.showError('Error', errorMessage);
        this.isLoading = false;
      }
    });
  }
}