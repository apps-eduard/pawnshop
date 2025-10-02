import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  ModalResult, 
  CityModalConfig, 
  BarangayModalConfig, 
  CategoryDescriptionModalConfig 
} from '../models/modal-interfaces';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  // Modal visibility states
  private cityModalSubject = new BehaviorSubject<boolean>(false);
  private barangayModalSubject = new BehaviorSubject<boolean>(false);
  private categoryDescriptionModalSubject = new BehaviorSubject<boolean>(false);

  // Modal configuration states
  private cityModalConfigSubject = new BehaviorSubject<CityModalConfig | null>(null);
  private barangayModalConfigSubject = new BehaviorSubject<BarangayModalConfig | null>(null);
  private categoryDescriptionModalConfigSubject = new BehaviorSubject<CategoryDescriptionModalConfig | null>(null);

  // Modal result subjects for communication
  private cityModalResultSubject = new BehaviorSubject<ModalResult | null>(null);
  private barangayModalResultSubject = new BehaviorSubject<ModalResult | null>(null);
  private categoryDescriptionModalResultSubject = new BehaviorSubject<ModalResult | null>(null);

  // Public observables
  cityModal$ = this.cityModalSubject.asObservable();
  barangayModal$ = this.barangayModalSubject.asObservable();
  categoryDescriptionModal$ = this.categoryDescriptionModalSubject.asObservable();

  cityModalConfig$ = this.cityModalConfigSubject.asObservable();
  barangayModalConfig$ = this.barangayModalConfigSubject.asObservable();
  categoryDescriptionModalConfig$ = this.categoryDescriptionModalConfigSubject.asObservable();

  cityModalResult$ = this.cityModalResultSubject.asObservable();
  barangayModalResult$ = this.barangayModalResultSubject.asObservable();
  categoryDescriptionModalResult$ = this.categoryDescriptionModalResultSubject.asObservable();

  // City Modal Methods
  openCityModal(config: CityModalConfig = {}) {
    this.cityModalConfigSubject.next({
      title: 'Add City',
      placeholder: 'Enter city name...',
      ...config
    });
    this.cityModalSubject.next(true);
  }

  closeCityModal() {
    this.cityModalSubject.next(false);
    this.cityModalConfigSubject.next(null);
  }

  cityModalResult(result: ModalResult) {
    this.cityModalResultSubject.next(result);
    this.closeCityModal();
  }

  // Barangay Modal Methods
  openBarangayModal(config: BarangayModalConfig) {
    this.barangayModalConfigSubject.next({
      title: 'Add Barangay',
      placeholder: 'Enter barangay name...',
      ...config
    });
    this.barangayModalSubject.next(true);
  }

  closeBarangayModal() {
    this.barangayModalSubject.next(false);
    this.barangayModalConfigSubject.next(null);
  }

  barangayModalResult(result: ModalResult) {
    this.barangayModalResultSubject.next(result);
    this.closeBarangayModal();
  }

  // Category Description Modal Methods
  openCategoryDescriptionModal(config: CategoryDescriptionModalConfig) {
    this.categoryDescriptionModalConfigSubject.next({
      title: 'Add Description',
      placeholder: 'Enter description...',
      ...config
    });
    this.categoryDescriptionModalSubject.next(true);
  }

  closeCategoryDescriptionModal() {
    this.categoryDescriptionModalSubject.next(false);
    this.categoryDescriptionModalConfigSubject.next(null);
  }

  categoryDescriptionModalResult(result: ModalResult) {
    this.categoryDescriptionModalResultSubject.next(result);
    this.closeCategoryDescriptionModal();
  }

  // Utility method to clear all modal results
  clearResults() {
    this.cityModalResultSubject.next(null);
    this.barangayModalResultSubject.next(null);
    this.categoryDescriptionModalResultSubject.next(null);
  }
}