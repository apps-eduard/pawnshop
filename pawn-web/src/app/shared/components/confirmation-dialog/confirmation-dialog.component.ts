import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService, ConfirmationState } from '../../../core/services/confirmation.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Backdrop -->
    <div
      *ngIf="state.isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      (click)="onCancel()">

      <!-- Modal Content - Compact Size -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-200 scale-100 animate-fadeIn"
        (click)="$event.stopPropagation()">

        <!-- Header with Icon - Compact -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-start gap-3">
            <!-- Icon - Smaller -->
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              [ngClass]="{
                'bg-red-100 dark:bg-red-900/30': state.config?.type === 'danger',
                'bg-yellow-100 dark:bg-yellow-900/30': state.config?.type === 'warning',
                'bg-blue-100 dark:bg-blue-900/30': state.config?.type === 'info'
              }">
              <span class="text-xl">{{ state.config?.icon }}</span>
            </div>

            <!-- Title - Compact -->
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {{ state.config?.title }}
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {{ state.config?.message }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer with Actions - Compact -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end gap-2">
          <!-- Cancel Button - Compact -->
          <button
            (click)="onCancel()"
            type="button"
            class="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            {{ state.config?.cancelText }}
          </button>

          <!-- Confirm Button - Compact -->
          <button
            (click)="onConfirm()"
            type="button"
            class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
            [ngClass]="{
              'bg-red-600 hover:bg-red-700 text-white': state.config?.type === 'danger',
              'bg-yellow-600 hover:bg-yellow-700 text-white': state.config?.type === 'warning',
              'bg-blue-600 hover:bg-blue-700 text-white': state.config?.type === 'info'
            }">
            {{ state.config?.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }
  `]
})
export class ConfirmationDialogComponent implements OnInit, OnDestroy {
  state: ConfirmationState = {
    isOpen: false,
    config: null,
    resolve: null
  };

  private destroy$ = new Subject<void>();

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit() {
    this.confirmationService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.state = state;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onConfirm() {
    this.confirmationService.close(true);
  }

  onCancel() {
    this.confirmationService.close(false);
  }
}
