import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appraisal, CreateAppraisalRequest } from '../models/interfaces';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AppraisalService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('AppraisalService initialized with API URL:', this.API_URL);
    // Check if we have a token on initialization
    const token = localStorage.getItem('token');
    console.log('Authentication token present:', !!token);
  }

  // Get all appraisals
  getAppraisals(): Observable<ApiResponse<Appraisal[]>> {
    console.log('Fetching all appraisals');
    return this.http.get<ApiResponse<Appraisal[]>>(`${this.API_URL}/appraisals`);
  }

  // Search appraisals
  searchAppraisals(query: string): Observable<ApiResponse<Appraisal[]>> {
    console.log(`Searching appraisals with query: "${query}"`);
    return this.http.get<ApiResponse<Appraisal[]>>(`${this.API_URL}/appraisals/search?q=${encodeURIComponent(query)}`);
  }

  // Get appraisals by status
  getAppraisalsByStatus(status: string): Observable<ApiResponse<Appraisal[]>> {
    return this.http.get<ApiResponse<Appraisal[]>>(`${this.API_URL}/appraisals/status/${status}`);
  }

  // Get today's appraisals
  getTodaysAppraisals(): Observable<ApiResponse<Appraisal[]>> {
    console.log('Fetching today\'s appraisals');
    return this.http.get<ApiResponse<Appraisal[]>>(`${this.API_URL}/appraisals/today`);
  }

  // Get appraisal by ID
  getAppraisal(id: number): Observable<ApiResponse<Appraisal>> {
    return this.http.get<ApiResponse<Appraisal>>(`${this.API_URL}/appraisals/${id}`);
  }

  // Create new appraisal
  createAppraisal(appraisalData: CreateAppraisalRequest): Observable<ApiResponse<Appraisal>> {
    console.log('Creating appraisal with data:', appraisalData);

    // Check authentication token before making request
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found when creating appraisal');
    } else {
      console.log('Authentication token exists:', !!token);
    }

    // Log the endpoint URL for debugging
    console.log('POST request to:', `${this.API_URL}/appraisals`);

    return this.http.post<ApiResponse<Appraisal>>(
      `${this.API_URL}/appraisals`,
      appraisalData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Update appraisal status
  updateAppraisalStatus(id: number, status: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.API_URL}/appraisals/${id}/status`, { status });
  }

  // Delete appraisal (Admin only)
  deleteAppraisal(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/appraisals/${id}`);
  }
}
