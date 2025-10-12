import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position: string;
  branch_id: number;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  role: string;
  user_count: number;
  users: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface RolePermissions {
  sidebar: string[];
  features: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RbacService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/rbac`;

  async getRoles(): Promise<any> {
    try {
      const response = await this.http.get<any>(`${this.apiUrl}/roles`).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  async getUsers(): Promise<any> {
    try {
      const response = await this.http.get<any>(`${this.apiUrl}/users`).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async updateUserRole(userId: number, role: string): Promise<any> {
    try {
      const response = await this.http.put<any>(`${this.apiUrl}/users/${userId}/role`, { role }).toPromise();
      return response;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    try {
      const response = await this.http.put<any>(`${this.apiUrl}/users/${userId}/status`, { is_active: isActive }).toPromise();
      return response;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async getPermissions(): Promise<any> {
    try {
      const response = await this.http.get<any>(`${this.apiUrl}/permissions`).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  }

  async getMenuItems(): Promise<any> {
    try {
      const response = await this.http.get<any>(`${this.apiUrl}/menu-items`).toPromise();
      return response;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  }
}
