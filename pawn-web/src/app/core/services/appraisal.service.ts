import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appraisal, CreateAppraisalRequest } from '../models/interfaces';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AppraisalService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Get all appraisals
  getAppraisals(): Observable<ApiResponse<Appraisal[]>> {
    return this.http.get<ApiResponse<Appraisal[]>>(`${this.API_URL}/appraisals`);
  }

  // Get appraisals by status
  getAppraisalsByStatus(status: string): Observable<ApiResponse<Appraisal[]>> {
    return this.http.get<ApiResponse<Appraisal[]>>(`${this.API_URL}/appraisals/status/${status}`);
  }

  // Get appraisal by ID
  getAppraisal(id: number): Observable<ApiResponse<Appraisal>> {
    return this.http.get<ApiResponse<Appraisal>>(`${this.API_URL}/appraisals/${id}`);
  }

  // Create new appraisal
  createAppraisal(appraisalData: CreateAppraisalRequest): Observable<ApiResponse<Appraisal>> {
    return this.http.post<ApiResponse<Appraisal>>(`${this.API_URL}/appraisals`, appraisalData);
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