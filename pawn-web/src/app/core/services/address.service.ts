import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { City, Barangay } from '../models/interfaces';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateCityRequest {
  name: string;
  province?: string;
  isActive: boolean;
}

export interface CreateBarangayRequest {
  name: string;
  cityId: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private readonly API_URL = '/api';

  constructor(private http: HttpClient) {}

  // Cities
  getCities(): Observable<ApiResponse<City[]>> {
    return this.http.get<ApiResponse<City[]>>(`${this.API_URL}/addresses/cities`);
  }

  getCity(id: number): Observable<ApiResponse<City>> {
    return this.http.get<ApiResponse<City>>(`${this.API_URL}/addresses/cities/${id}`);
  }

  createCity(cityData: CreateCityRequest): Observable<ApiResponse<City>> {
    return this.http.post<ApiResponse<City>>(`${this.API_URL}/addresses/cities`, cityData);
  }

  updateCity(id: number, cityData: Partial<CreateCityRequest>): Observable<ApiResponse<City>> {
    return this.http.put<ApiResponse<City>>(`${this.API_URL}/addresses/cities/${id}`, cityData);
  }

  deleteCity(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/addresses/cities/${id}`);
  }

  // Barangays
  getBarangays(): Observable<ApiResponse<Barangay[]>> {
    return this.http.get<ApiResponse<Barangay[]>>(`${this.API_URL}/addresses/barangays`);
  }

  getBarangaysByCity(cityId: number): Observable<ApiResponse<Barangay[]>> {
    return this.http.get<ApiResponse<Barangay[]>>(`${this.API_URL}/addresses/cities/${cityId}/barangays`);
  }

  getBarangay(id: number): Observable<ApiResponse<Barangay>> {
    return this.http.get<ApiResponse<Barangay>>(`${this.API_URL}/addresses/barangays/${id}`);
  }

  createBarangay(barangayData: CreateBarangayRequest): Observable<ApiResponse<Barangay>> {
    return this.http.post<ApiResponse<Barangay>>(`${this.API_URL}/addresses/barangays`, barangayData);
  }

  updateBarangay(id: number, barangayData: Partial<CreateBarangayRequest>): Observable<ApiResponse<Barangay>> {
    return this.http.put<ApiResponse<Barangay>>(`${this.API_URL}/addresses/barangays/${id}`, barangayData);
  }

  deleteBarangay(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/addresses/barangays/${id}`);
  }
}
