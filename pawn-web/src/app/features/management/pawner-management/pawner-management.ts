import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PawnerService } from '../../../core/services/pawner.service';
import { AddressService } from '../../../core/services/address.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pawner, City, Barangay } from '../../../core/models/interfaces';

interface PawnerWithActions extends Pawner {
  isEditing?: boolean;
  originalData?: Pawner;
  cityName?: string;
  barangayName?: string;
}

@Component({
  selector: 'app-pawner-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pawner-management.html',
  styleUrl: './pawner-management.css'
})
export class PawnerManagementComponent implements OnInit, OnDestroy {
  pawners: PawnerWithActions[] = [];
  filteredPawners: PawnerWithActions[] = [];
  cities: City[] = [];
  barangays: Barangay[] = [];
  selectedCityBarangays: Barangay[] = [];

  isLoading = false;
  showAddForm = false;
  searchTerm = '';
  selectedCity = '';
  selectedStatus = '';

  pawnerForm: FormGroup;
  editingPawnerId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private pawnerService: PawnerService,
    private addressService: AddressService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.pawnerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,11}$/)]],
      email: ['', [Validators.email]],
      cityId: ['', [Validators.required]],
      barangayId: ['', [Validators.required]],
      addressDetails: ['', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPawners();
    this.loadCities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load all pawners
  loadPawners(): void {
    this.isLoading = true;
    console.log('Loading pawners...');
    this.pawnerService.getPawners()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Pawners response:', response);
          if (response.success) {
            this.pawners = response.data.map((pawner: any) => ({
              ...pawner,
              isEditing: false
            }));
            this.applyFilters();
            console.log('Loaded pawners:', this.pawners.length);
          } else {
            console.error('Failed to load pawners:', response.message);
            this.toastService.showError('Error!', 'Failed to load pawners');
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading pawners:', error);
          this.toastService.showError('Error!', 'Failed to load pawners');
          this.isLoading = false;
        }
      });
  }

  // Load cities for dropdown
  loadCities(): void {
    this.addressService.getCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.cities = response.data.filter((city: City) => city.isActive);

            // Set Butuan as default city when adding new pawner
            if (!this.editingPawnerId) {
              const butuanCity = this.cities.find(city =>
                city.name.toLowerCase().includes('butuan')
              );

              if (butuanCity) {
                this.pawnerForm.patchValue({ cityId: butuanCity.id });
                // Trigger barangays load
                this.onCityChange();
              }
            }
          }
        },
        error: (error: any) => {
          console.error('Error loading cities:', error);
        }
      });
  }

  // Load barangays when city is selected
  onCityChange(): void {
    const selectedCityId = this.pawnerForm.get('cityId')?.value;
    if (selectedCityId) {
      this.addressService.getBarangaysByCity(selectedCityId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.selectedCityBarangays = response.data.filter((barangay: Barangay) => barangay.isActive);
            }
          },
          error: (error: any) => {
            console.error('Error loading barangays:', error);
          }
        });
    } else {
      this.selectedCityBarangays = [];
    }

    // Reset barangay selection when city changes
    this.pawnerForm.patchValue({ barangayId: '' });
  }

  // Load barangays when city is changed during inline edit
  onCityChangeForPawner(pawner: PawnerWithActions): void {
    if (pawner.cityId) {
      this.addressService.getBarangaysByCity(pawner.cityId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.selectedCityBarangays = response.data.filter((barangay: Barangay) => barangay.isActive);
            }
          },
          error: (error: any) => {
            console.error('Error loading barangays for inline edit:', error);
          }
        });
    } else {
      this.selectedCityBarangays = [];
    }

    // Reset barangay selection when city changes
    pawner.barangayId = undefined;
  }

  // Apply search and filters
  applyFilters(): void {
    this.filteredPawners = this.pawners.filter(pawner => {
      const matchesSearch = !this.searchTerm ||
        pawner.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        pawner.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        pawner.contactNumber.includes(this.searchTerm) ||
        (pawner.email && pawner.email.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesCity = !this.selectedCity || pawner.cityId?.toString() === this.selectedCity;

      const matchesStatus = !this.selectedStatus ||
        (this.selectedStatus === 'active' && pawner.isActive) ||
        (this.selectedStatus === 'inactive' && !pawner.isActive);

      return matchesSearch && matchesCity && matchesStatus;
    });
  }

  // Search pawners
  onSearch(): void {
    this.applyFilters();
  }

  // Filter by city
  onCityFilter(): void {
    this.applyFilters();
  }

  // Filter by status
  onStatusFilter(): void {
    this.applyFilters();
  }

  // Show add pawner form
  showAddPawnerForm(): void {
    this.showAddForm = true;
    this.editingPawnerId = null;
    this.pawnerForm.reset({ isActive: true });
    this.selectedCityBarangays = [];
  }

  // Hide add pawner form
  hideAddPawnerForm(): void {
    this.showAddForm = false;
    this.pawnerForm.reset();
    this.selectedCityBarangays = [];
  }

  // Submit pawner form (create new pawner)
  onSubmitPawner(): void {
    if (this.pawnerForm.valid) {
      const pawnerData = this.pawnerForm.value;
      console.log('Submitting pawner data:', pawnerData);

      this.pawnerService.createPawner(pawnerData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            console.log('Pawner creation response:', response);
            if (response.success) {
              this.toastService.showSuccess('Success!', 'Pawner created successfully');
              this.loadPawners();
              this.hideAddPawnerForm();
              this.pawnerForm.reset({ isActive: true });
            } else {
              this.toastService.showError('Error!', response.message || 'Failed to create pawner');
            }
          },
          error: (error: any) => {
            console.error('Error creating pawner:', error);
            this.toastService.showError('Error!', error.error?.message || 'Failed to create pawner');
          }
        });
    } else {
      this.toastService.showWarning('Validation Error', 'Please fill in all required fields');
      console.log('Form is invalid:', this.pawnerForm.errors);
    }
  }

  // Start editing pawner
  startEdit(pawner: PawnerWithActions): void {
    pawner.isEditing = true;
    pawner.originalData = { ...pawner };

    // Load barangays for the current city when editing
    if (pawner.cityId) {
      this.addressService.getBarangaysByCity(pawner.cityId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.selectedCityBarangays = response.data;
            }
          },
          error: (error: any) => {
            console.error('Error loading barangays for edit:', error);
          }
        });
    }
  }

  // Cancel editing
  cancelEdit(pawner: PawnerWithActions): void {
    if (pawner.originalData) {
      Object.assign(pawner, pawner.originalData);
      pawner.originalData = undefined;
    }
    pawner.isEditing = false;
  }

  // Save pawner changes
  savePawner(pawner: PawnerWithActions): void {
    const pawnerData = {
      firstName: pawner.firstName,
      lastName: pawner.lastName,
      contactNumber: pawner.contactNumber,
      email: pawner.email,
      cityId: pawner.cityId,
      barangayId: pawner.barangayId,
      addressDetails: pawner.addressDetails,
      isActive: pawner.isActive
    };

    this.pawnerService.updatePawner(pawner.id, pawnerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            pawner.isEditing = false;
            pawner.originalData = undefined;
          }
        },
        error: (error: any) => {
          console.error('Error updating pawner:', error);
        }
      });
  }

  // Toggle pawner status
  togglePawnerStatus(pawner: PawnerWithActions): void {
    const newStatus = !pawner.isActive;

    this.pawnerService.updatePawner(pawner.id, { isActive: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            pawner.isActive = newStatus;
          }
        },
        error: (error: any) => {
          console.error('Error updating pawner status:', error);
        }
      });
  }

  // Delete pawner
  deletePawner(pawner: PawnerWithActions): void {
    if (confirm(`Are you sure you want to delete ${pawner.firstName} ${pawner.lastName}?`)) {
      this.pawnerService.deletePawner(pawner.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadPawners();
            }
          },
          error: (error: any) => {
            console.error('Error deleting pawner:', error);
          }
        });
    }
  }

  // Get city name by ID
  getCityName(cityId: number): string {
    const city = this.cities.find(c => c.id === cityId);
    return city ? city.name : 'Unknown City';
  }

  // Get barangay name by ID
  getBarangayName(barangayId: number): string {
    const barangay = this.barangays.find(b => b.id === barangayId);
    return barangay ? barangay.name : 'Unknown Barangay';
  }

  // Get pawner initials
  getPawnerInitials(pawner: PawnerWithActions): string {
    return `${pawner.firstName?.charAt(0) || ''}${pawner.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  // Get status badge class
  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  // Get available cities for filter
  getAvailableCities(): City[] {
    return this.cities.filter(city => city.isActive);
  }
}

