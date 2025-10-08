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
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm transform transition-all duration-200 ease-out">

        <!-- Header -->
        <div class="flex items-center justify-between p-4 pb-2">
          <div class="flex items-center space-x-2">
            <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ config?.title || 'Add Description' }}</h3>
          </div>
          <button type="button" (click)="onCancel()"
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <div class="px-4 pb-4">
          <div class="space-y-3">

            <!-- Selected Category Display -->
            <div class="p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
              <div class="flex items-center space-x-2">
                <div class="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                  <svg class="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 713 12V7a4 4 0 014-4z"></path>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-emerald-700 dark:text-emerald-300">Selected Category</p>
                  <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{{ config?.selectedCategoryName || 'No category selected' }}</p>
                </div>
              </div>
            </div>

            <!-- Description Input -->
            <div>
              <label for="descriptionInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div class="relative">
                <textarea
                  #descriptionInput
                  id="descriptionInput"
                  [(ngModel)]="description"
                  [placeholder]="config?.placeholder || 'Enter description...'"
                  rows="3"
                  class="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500"
                  [class.border-emerald-500]="description && description.trim()"
                  [class.bg-emerald-50]="description && description.trim()"
                  [class.dark:bg-emerald-900/10]="description && description.trim()">
                </textarea>
                <div *ngIf="description && description.trim()" class="absolute right-3 top-3">
                  <svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex justify-between gap-3 pt-2">
              <!-- Add Button (Left) -->
              <button type="button" (click)="onAdd()" [disabled]="!description || !description.trim() || isLoading"
                      class="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm hover:shadow-md">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ isLoading ? 'Adding...' : 'Add Description' }}
              </button>

              <!-- Cancel Button (Right) -->
              <button type="button" (click)="onCancel()"
                      class="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-all">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Cancel
              </button>
            </div>
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
