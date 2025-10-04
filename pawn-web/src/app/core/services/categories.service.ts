import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/interfaces';

export interface Category {
  id: number;
  name: string;
  interest_rate: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  descriptions?: CategoryDescription[];
}

export interface CategoryDescription {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryDescriptionRequest {
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private baseUrl = 'http://localhost:3000/api/categories';

  constructor(private http: HttpClient) {}

  // Get all categories
  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(this.baseUrl);
  }

  // Get all categories with their descriptions
  getCategoriesWithDescriptions(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/with-descriptions`);
  }

  // Get category descriptions by category ID
  getCategoryDescriptions(categoryId: number): Observable<ApiResponse<CategoryDescription[]>> {
    return this.http.get<ApiResponse<CategoryDescription[]>>(`${this.baseUrl}/${categoryId}/descriptions`);
  }

  // Create new category description
  createCategoryDescription(categoryId: number, request: CreateCategoryDescriptionRequest): Observable<ApiResponse<CategoryDescription>> {
    return this.http.post<ApiResponse<CategoryDescription>>(`${this.baseUrl}/${categoryId}/descriptions`, request);
  }
}