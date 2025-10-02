import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ModalService } from '../../../shared/services/modal.service';
import { AddCityModalComponent } from '../../../shared/modals/add-city-modal/add-city-modal.component';
import { AddBarangayModalComponent } from '../../../shared/modals/add-barangay-modal/add-barangay-modal.component';
import { AddCategoryDescriptionModalComponent } from '../../../shared/modals/add-category-description-modal/add-category-description-modal.component';

@Component({
  selector: 'app-modal-example',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    AddCityModalComponent,
    AddBarangayModalComponent,
    AddCategoryDescriptionModalComponent
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Reusable Modal Components Example</h1>
      
      <!-- Example Usage Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- City Modal Example -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold mb-3">Add City Modal</h3>
          <button (click)="openCityModal()" 
            class="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-all">
            Open City Modal
          </button>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Last Result: {{ cityResult | json }}
          </p>
        </div>

        <!-- Barangay Modal Example -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold mb-3">Add Barangay Modal</h3>
          <select [(ngModel)]="selectedCityId" class="w-full mb-2 px-2 py-1 border rounded">
            <option value="">Select City First</option>
            <option value="1">Manila</option>
            <option value="2">Quezon City</option>
          </select>
          <button (click)="openBarangayModal()" [disabled]="!selectedCityId"
            class="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-md transition-all">
            Open Barangay Modal
          </button>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Last Result: {{ barangayResult | json }}
          </p>
        </div>

        <!-- Category Description Modal Example -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold mb-3">Add Category Description Modal</h3>
          <select [(ngModel)]="selectedCategoryId" class="w-full mb-2 px-2 py-1 border rounded">
            <option value="">Select Category First</option>
            <option value="1">Electronics</option>
            <option value="2">Jewelry</option>
          </select>
          <button (click)="openCategoryDescriptionModal()" [disabled]="!selectedCategoryId"
            class="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-md transition-all">
            Open Description Modal
          </button>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Last Result: {{ categoryDescriptionResult | json }}
          </p>
        </div>
      </div>

      <!-- Code Examples -->
      <div class="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">How to Use in Your Components</h2>
        
        <div class="space-y-4">
          <div>
            <h3 class="font-medium mb-2">1. Import the required components and service:</h3>
            <pre class="bg-black text-white p-3 rounded text-sm overflow-x-auto"><code>{{importExample}}</code></pre>
          </div>
          
          <div>
            <h3 class="font-medium mb-2">2. Add modal components to your template:</h3>
            <pre class="bg-black text-white p-3 rounded text-sm overflow-x-auto"><code>{{templateExample}}</code></pre>
          </div>
          
          <div>
            <h3 class="font-medium mb-2">3. Use the modal service in your component:</h3>
            <pre class="bg-black text-white p-3 rounded text-sm overflow-x-auto"><code>{{usageExample}}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Components -->
    <app-add-city-modal></app-add-city-modal>
    <app-add-barangay-modal></app-add-barangay-modal>
    <app-add-category-description-modal></app-add-category-description-modal>
  `
})
export class ModalExampleComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  selectedCityId = '';
  selectedCategoryId = '';
  cityResult: any = null;
  barangayResult: any = null;
  categoryDescriptionResult: any = null;

  importExample = `import { ModalService } from '../shared/services/modal.service';
import { AddCityModalComponent } from '../shared/modals/add-city-modal/add-city-modal.component';
// ... other imports`;

  templateExample = `<!-- Add these to your template -->
<app-add-city-modal></app-add-city-modal>
<app-add-barangay-modal></app-add-barangay-modal>
<app-add-category-description-modal></app-add-category-description-modal>`;

  usageExample = `// In your component
private modalService = inject(ModalService);

// Open city modal
openCityModal() {
  this.modalService.openCityModal({
    title: 'Add New City',
    placeholder: 'Enter city name...'
  });
}

// Listen for results
ngOnInit() {
  this.modalService.cityModalResult$.subscribe(result => {
    if (result?.success) {
      console.log('City added:', result.data);
      // Refresh your city list here
    }
  });
}`;

  ngOnInit() {
    // Subscribe to modal results
    this.modalService.cityModalResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.cityResult = result;
        if (result.success) {
          console.log('City added successfully:', result.data);
        }
      }
    });

    this.modalService.barangayModalResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.barangayResult = result;
        if (result.success) {
          console.log('Barangay added successfully:', result.data);
        }
      }
    });

    this.modalService.categoryDescriptionModalResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.categoryDescriptionResult = result;
        if (result.success) {
          console.log('Description added successfully:', result.data);
        }
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCityModal() {
    this.modalService.openCityModal({
      title: 'Add New City',
      placeholder: 'Enter city name...'
    });
  }

  openBarangayModal() {
    if (!this.selectedCityId) return;
    
    const cityName = this.selectedCityId === '1' ? 'Manila' : 'Quezon City';
    
    this.modalService.openBarangayModal({
      title: 'Add New Barangay',
      placeholder: 'Enter barangay name...',
      selectedCityId: this.selectedCityId,
      selectedCityName: cityName
    });
  }

  openCategoryDescriptionModal() {
    if (!this.selectedCategoryId) return;
    
    const categoryName = this.selectedCategoryId === '1' ? 'Electronics' : 'Jewelry';
    
    this.modalService.openCategoryDescriptionModal({
      title: 'Add Description',
      placeholder: 'Enter category description...',
      selectedCategoryId: this.selectedCategoryId,
      selectedCategoryName: categoryName
    });
  }
}