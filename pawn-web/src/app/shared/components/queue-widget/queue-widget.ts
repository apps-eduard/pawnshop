import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

interface QueueEntry {
  id: number;
  queueNumber: string;
  status: string;
  isNewPawner: boolean;
  serviceType: string;
  joinedAt: string;
  pawner: {
    id: number;
    firstName: string;
    lastName: string;
    mobileNumber: string;
  };
}

@Component({
  selector: 'app-queue-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          🎫 Waiting Queue
        </h2>
        <span class="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
          {{queueEntries.length}} waiting
        </span>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && queueEntries.length === 0" class="text-center py-8">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <p class="text-gray-500 dark:text-gray-400">No pawners in queue</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Pawners will appear here when they check in</p>
      </div>

      <!-- Queue List -->
      <div *ngIf="!isLoading && queueEntries.length > 0" class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        <div *ngFor="let entry of queueEntries"
             (click)="selectPawner(entry)"
             class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg font-bold text-blue-600 dark:text-blue-400">{{entry.queueNumber}}</span>
                <span *ngIf="entry.isNewPawner" class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                  🆕 New
                </span>
                <span *ngIf="!entry.isNewPawner" class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                  👤 Returning
                </span>
              </div>
              <p class="font-semibold text-gray-900 dark:text-white">
                {{entry.pawner.firstName}} {{entry.pawner.lastName}}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{entry.pawner.mobileNumber}}</p>
              <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {{getServiceTypeLabel(entry.serviceType)}} • {{getWaitTime(entry.joinedAt)}}
              </p>
            </div>
            <button 
              (click)="selectPawner(entry); $event.stopPropagation()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.5);
      border-radius: 20px;
    }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.7);
    }
  `]
})
export class QueueWidget implements OnInit, OnDestroy {
  @Output() pawnerSelected = new EventEmitter<any>();
  
  private destroy$ = new Subject<void>();
  private readonly API_URL = 'http://localhost:3000/api';

  queueEntries: QueueEntry[] = [];
  isLoading = false;

  serviceTypes = [
    { value: 'new_loan', label: 'New Loan' },
    { value: 'renew', label: 'Renew Loan' },
    { value: 'redeem', label: 'Redeem Item' },
    { value: 'additional_loan', label: 'Additional Loan' },
    { value: 'inquiry', label: 'Inquiry' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Initial load
    this.loadQueue();

    // Auto-refresh every 10 seconds
    interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => this.http.get<any>(`${this.API_URL}/queue?status=waiting`)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.queueEntries = response.data || [];
        },
        error: (error) => {
          console.error('Error loading queue:', error);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQueue(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.API_URL}/queue?status=waiting`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.queueEntries = response.data || [];
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error loading queue:', error);
        }
      });
  }

  selectPawner(entry: QueueEntry): void {
    this.pawnerSelected.emit({
      pawnerId: entry.pawner.id,
      pawner: entry.pawner,
      queueId: entry.id,
      queueNumber: entry.queueNumber,
      serviceType: entry.serviceType,
      isNewPawner: entry.isNewPawner
    });

    // Update queue status to processing
    this.http.put<any>(`${this.API_URL}/queue/${entry.id}/status`, { status: 'processing' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Queue status updated to processing');
          this.loadQueue(); // Refresh queue
        },
        error: (error) => {
          console.error('Error updating queue status:', error);
        }
      });
  }

  getServiceTypeLabel(type: string): string {
    const service = this.serviceTypes.find(s => s.value === type);
    return service ? service.label : type;
  }

  getWaitTime(joinedAt: string): string {
    const joined = new Date(joinedAt);
    const now = new Date();
    const diffMs = now.getTime() - joined.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
}
