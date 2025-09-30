import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/interfaces';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
  position?: string;
  contactNumber?: string;
  cityId?: number;
  barangayId?: number;
  address?: string;
  isActive: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  position?: string;
  contactNumber?: string;
  cityId?: number;
  barangayId?: number;
  address?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Get all users
  getUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.API_URL}/users`);
  }

  // Get user by ID
  getUser(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/users/${id}`);
  }

  // Create new user
  createUser(userData: CreateUserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.API_URL}/users`, userData);
  }

  // Update user
  updateUser(id: number, userData: UpdateUserRequest): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/users/${id}`, userData);
  }

  // Delete user
  deleteUser(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/users/${id}`);
  }

  // Reset user password
  resetPassword(id: number): Observable<ApiResponse<{ newPassword: string }>> {
    return this.http.post<ApiResponse<{ newPassword: string }>>(`${this.API_URL}/users/${id}/reset-password`, {});
  }

  // Change user password
  changePassword(id: number, oldPassword: string, newPassword: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/users/${id}/change-password`, {
      oldPassword,
      newPassword
    });
  }
}
