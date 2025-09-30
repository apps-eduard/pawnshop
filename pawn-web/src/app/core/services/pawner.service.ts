import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pawner } from '../models/interfaces';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreatePawnerRequest {
  firstName: string;
  lastName: string;
  contactNumber: string;
  email?: string;
  cityId: number;
  barangayId: number;
  addressDetails: string;
  isActive: boolean;
}

export interface UpdatePawnerRequest {
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  email?: string;
  cityId?: number;
  barangayId?: number;
  addressDetails?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PawnerService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Get all pawners
  getPawners(): Observable<ApiResponse<Pawner[]>> {
    return this.http.get<ApiResponse<Pawner[]>>(`${this.API_URL}/pawners`);
  }

  // Get pawner by ID
  getPawner(id: number): Observable<ApiResponse<Pawner>> {
    return this.http.get<ApiResponse<Pawner>>(`${this.API_URL}/pawners/${id}`);
  }

  // Create new pawner
  createPawner(pawnerData: CreatePawnerRequest): Observable<ApiResponse<Pawner>> {
    return this.http.post<ApiResponse<Pawner>>(`${this.API_URL}/pawners`, pawnerData);
  }

  // Update pawner
  updatePawner(id: number, pawnerData: UpdatePawnerRequest): Observable<ApiResponse<Pawner>> {
    return this.http.put<ApiResponse<Pawner>>(`${this.API_URL}/pawners/${id}`, pawnerData);
  }

  // Delete pawner
  deletePawner(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/pawners/${id}`);
  }

  // Search pawners
  searchPawners(query: string): Observable<ApiResponse<Pawner[]>> {
    return this.http.get<ApiResponse<Pawner[]>>(`${this.API_URL}/pawners/search?q=${encodeURIComponent(query)}`);
  }
}
