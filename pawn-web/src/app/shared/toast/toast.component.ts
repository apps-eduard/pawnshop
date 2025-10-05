import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <div
        *ngFor="let toast of toasts"
        [class]="getToastClasses(toast)"
        class="min-w-64 max-w-sm w-auto bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 transform transition-all duration-300 ease-in-out">
        <div class="p-3">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg *ngIf="toast.type === 'success'" class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg *ngIf="toast.type === 'error'" class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg *ngIf="toast.type === 'warning'" class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <svg *ngIf="toast.type === 'info'" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-2 w-0 flex-1 pt-0.5">
              <p class="text-sm font-medium text-gray-900">{{ toast.title }}</p>
              <p class="mt-0.5 text-xs text-gray-500">{{ toast.message }}</p>
            </div>
            <div class="ml-3 flex-shrink-0 flex">
              <button
                (click)="removeToast(toast.id)"
                class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span class="sr-only">Close</span>
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-enter {
      transform: translateX(100%);
      opacity: 0;
    }
    .toast-enter-active {
      transform: translateX(0);
      opacity: 1;
    }
    .toast-exit {
      transform: translateX(0);
      opacity: 1;
    }
    .toast-exit-active {
      transform: translateX(100%);
      opacity: 0;
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private destroy$ = new Subject<void>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeToast(id: string): void {
    this.toastService.removeToast(id);
  }

  getToastClasses(toast: Toast): string {
    const baseClasses = 'border-l-4 ';
    switch (toast.type) {
      case 'success':
        return baseClasses + 'border-green-400 bg-green-50';
      case 'error':
        return baseClasses + 'border-red-400 bg-red-50';
      case 'warning':
        return baseClasses + 'border-yellow-400 bg-yellow-50';
      case 'info':
        return baseClasses + 'border-blue-400 bg-blue-50';
      default:
        return baseClasses + 'border-gray-400 bg-gray-50';
    }
  }
}
