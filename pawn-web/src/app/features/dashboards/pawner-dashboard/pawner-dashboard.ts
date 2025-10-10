import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Pawner {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  cityId?: number;
  barangayId?: number;
}

interface QueueEntry {
  id: number;
  queueNumber: string;
  status: string;
  isNewPawner: boolean;
  serviceType: string;
  joinedAt: string;
  pawner?: Pawner;
}

@Component({
  selector: 'app-pawner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pawner-dashboard.html',
  styleUrl: './pawner-dashboard.css'
})
export class PawnerDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly API_URL = 'http://localhost:3000/api';

  // Search state
  searchTerm = '';
  searchResults: Pawner[] = [];
  selectedPawner: Pawner | null = null;
  isSearching = false;
  searchPerformed = false;

  // Queue state
  serviceType = 'new_loan';
  queueEntry: QueueEntry | null = null;
  isJoiningQueue = false;
  errorMessage = '';

  serviceTypes = [
    { value: 'new_loan', label: 'New Loan', icon: '💰' },
    { value: 'renew', label: 'Renew Loan', icon: '🔄' },
    { value: 'redeem', label: 'Redeem Item', icon: '🎁' },
    { value: 'additional_loan', label: 'Additional Loan', icon: '➕' },
    { value: 'inquiry', label: 'Inquiry', icon: '❓' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Pawner Dashboard initialized with queue system');
    this.checkExistingQueue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Search for pawner by mobile number or name
  searchPawner(): void {
    if (!this.searchTerm || this.searchTerm.length < 3) {
      this.errorMessage = 'Please enter at least 3 characters to search';
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';
    this.searchPerformed = true;

    this.http.get<any>(`${this.API_URL}/pawners/search?q=${encodeURIComponent(this.searchTerm)}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSearching = false;
          this.searchResults = response.data || [];
          if (this.searchResults.length === 0) {
            this.errorMessage = 'No pawner found. You can register as a new pawner.';
          }
        },
        error: (error) => {
          this.isSearching = false;
          this.errorMessage = 'Error searching pawners. Please try again.';
          console.error('Search error:', error);
        }
      });
  }

  // Select a pawner from search results
  selectPawner(pawner: Pawner): void {
    this.selectedPawner = pawner;
    this.searchResults = [];
    this.searchPerformed = false;
    this.errorMessage = '';
  }

  // Clear selection and start over
  clearSelection(): void {
    this.selectedPawner = null;
    this.searchTerm = '';
    this.searchResults = [];
    this.searchPerformed = false;
    this.errorMessage = '';
  }

  // Join the queue
  joinQueue(): void {
    if (!this.selectedPawner) {
      this.errorMessage = 'Please search and select yourself first';
      return;
    }

    if (!this.serviceType) {
      this.errorMessage = 'Please select a service type';
      return;
    }

    this.isJoiningQueue = true;
    this.errorMessage = '';

    const queueData = {
      pawnerId: this.selectedPawner.id,
      serviceType: this.serviceType,
      isNewPawner: false, // They searched themselves, so they exist
      notes: ''
    };

    this.http.post<any>(`${this.API_URL}/queue`, queueData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isJoiningQueue = false;
          this.queueEntry = response.data;
          console.log('Joined queue:', this.queueEntry);
        },
        error: (error) => {
          this.isJoiningQueue = false;
          this.errorMessage = error.error?.message || 'Failed to join queue. Please try again.';
          console.error('Join queue error:', error);
        }
      });
  }

  // Check if user already in queue
  checkExistingQueue(): void {
    this.http.get<any>(`${this.API_URL}/queue?status=waiting`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            this.queueEntry = response.data[0]; // Get first waiting entry
          }
        },
        error: (error) => {
          console.error('Error checking queue:', error);
        }
      });
  }

  // Leave the queue
  leaveQueue(): void {
    if (!this.queueEntry) return;

    if (confirm('Are you sure you want to leave the queue?')) {
      this.http.delete<any>(`${this.API_URL}/queue/${this.queueEntry.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.queueEntry = null;
            this.errorMessage = 'You have left the queue.';
            setTimeout(() => this.errorMessage = '', 3000);
          },
          error: (error) => {
            this.errorMessage = 'Failed to leave queue. Please try again.';
            console.error('Leave queue error:', error);
          }
        });
    }
  }

  // Format service type label
  getServiceTypeLabel(type: string): string {
    const service = this.serviceTypes.find(s => s.value === type);
    return service ? service.label : type;
  }

  // Format queue time
  getQueueTime(joinedAt: string): string {
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
