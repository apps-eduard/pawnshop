import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AddressService } from '../../core/services/address.service';
import { City, Barangay } from '../../core/models/interfaces';

interface CityWithBarangays extends City {
  barangays?: BarangayWithActions[];
  showBarangays?: boolean;
  isEditing?: boolean;
  originalData?: City;
}

interface BarangayWithActions extends Barangay {
  isEditing?: boolean;
  originalData?: Barangay;
}

@Component({
  selector: 'app-address-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './address-management.html',
  styleUrl: './address-management.css'
})
export class AddressManagementComponent implements OnInit, OnDestroy {
  cities: CityWithBarangays[] = [];
  isLoading = false;
  showAddCityForm = false;
  showAddBarangayForm = false;
  selectedCityForBarangay: number | null = null;

  cityForm: FormGroup;
  barangayForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private addressService: AddressService,
    private fb: FormBuilder
  ) {
    this.cityForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      province: [''],
      isActive: [true]
    });

    this.barangayForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      cityId: ['', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadCities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper method to ensure barangays are properly typed
  asBarangayWithActions(barangay: any): BarangayWithActions {
    return barangay as BarangayWithActions;
  }

  // Load all cities
  loadCities(): void {
    this.isLoading = true;
    this.addressService.getCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.cities = response.data.map((city: City) => ({
              ...city,
              showBarangays: false,
              isEditing: false,
              barangays: []
            }));
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading cities:', error);
          this.isLoading = false;
        }
      });
  }

  // Toggle barangays display for a city
  toggleBarangays(city: CityWithBarangays): void {
    city.showBarangays = !city.showBarangays;

    if (city.showBarangays && (!city.barangays || city.barangays.length === 0)) {
      this.loadBarangaysForCity(city);
    }
  }

  // Load barangays for a specific city
  loadBarangaysForCity(city: CityWithBarangays): void {
    this.addressService.getBarangaysByCity(city.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            city.barangays = response.data.map((barangay: Barangay): BarangayWithActions => ({
              ...barangay,
              isEditing: false
            }));
          }
        },
        error: (error: any) => {
          console.error('Error loading barangays:', error);
        }
      });
  }

  // Show add city form
  showAddCityFormModal(): void {
    this.showAddCityForm = true;
    this.cityForm.reset({ isActive: true });
  }

  // Hide add city form
  hideAddCityFormModal(): void {
    this.showAddCityForm = false;
    this.cityForm.reset();
  }

  // Submit city form
  onSubmitCity(): void {
    if (this.cityForm.valid) {
      const cityData = this.cityForm.value;

      this.addressService.createCity(cityData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadCities();
              this.hideAddCityFormModal();
            }
          },
          error: (error: any) => {
            console.error('Error creating city:', error);
          }
        });
    }
  }

  // Show add barangay form
  showAddBarangayFormModal(cityId?: number): void {
    this.showAddBarangayForm = true;
    this.selectedCityForBarangay = cityId || null;
    this.barangayForm.reset({
      isActive: true,
      cityId: cityId || ''
    });
  }

  // Hide add barangay form
  hideAddBarangayFormModal(): void {
    this.showAddBarangayForm = false;
    this.selectedCityForBarangay = null;
    this.barangayForm.reset();
  }

  // Submit barangay form
  onSubmitBarangay(): void {
    if (this.barangayForm.valid) {
      const barangayData = this.barangayForm.value;

      this.addressService.createBarangay(barangayData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              // Reload barangays for the specific city
              const city = this.cities.find(c => c.id === barangayData.cityId);
              if (city && city.showBarangays) {
                this.loadBarangaysForCity(city);
              }
              this.hideAddBarangayFormModal();
            }
          },
          error: (error: any) => {
            console.error('Error creating barangay:', error);
          }
        });
    }
  }

  // Start editing city
  startEditCity(city: CityWithBarangays): void {
    city.isEditing = true;
    city.originalData = { ...city };
  }

  // Cancel editing city
  cancelEditCity(city: CityWithBarangays): void {
    if (city.originalData) {
      Object.assign(city, city.originalData);
      city.originalData = undefined;
    }
    city.isEditing = false;
  }

  // Save city changes
  saveCity(city: CityWithBarangays): void {
    const cityData = {
      name: city.name,
      province: city.province,
      isActive: city.isActive
    };

    this.addressService.updateCity(city.id, cityData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            city.isEditing = false;
            city.originalData = undefined;
          }
        },
        error: (error: any) => {
          console.error('Error updating city:', error);
        }
      });
  }

  // Delete city
  deleteCity(city: CityWithBarangays): void {
    if (confirm(`Are you sure you want to delete ${city.name}? This will also delete all its barangays.`)) {
      this.addressService.deleteCity(city.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadCities();
            }
          },
          error: (error: any) => {
            console.error('Error deleting city:', error);
          }
        });
    }
  }

  // Start editing barangay
  startEditBarangay(barangay: BarangayWithActions): void {
    barangay.isEditing = true;
    barangay.originalData = { ...barangay };
  }

  // Cancel editing barangay
  cancelEditBarangay(barangay: BarangayWithActions): void {
    if (barangay.originalData) {
      Object.assign(barangay, barangay.originalData);
      barangay.originalData = undefined;
    }
    barangay.isEditing = false;
  }

  // Save barangay changes
  saveBarangay(barangay: BarangayWithActions): void {
    const barangayData = {
      name: barangay.name,
      isActive: barangay.isActive
    };

    this.addressService.updateBarangay(barangay.id, barangayData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            barangay.isEditing = false;
            barangay.originalData = undefined;
          }
        },
        error: (error: any) => {
          console.error('Error updating barangay:', error);
        }
      });
  }

  // Delete barangay
  deleteBarangay(barangay: BarangayWithActions, city: CityWithBarangays): void {
    if (confirm(`Are you sure you want to delete ${barangay.name}?`)) {
      this.addressService.deleteBarangay(barangay.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadBarangaysForCity(city);
            }
          },
          error: (error: any) => {
            console.error('Error deleting barangay:', error);
          }
        });
    }
  }

  // Get status badge class
  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  // Get available cities for barangay form
  getAvailableCities(): CityWithBarangays[] {
    return this.cities.filter(city => city.isActive);
  }
}
