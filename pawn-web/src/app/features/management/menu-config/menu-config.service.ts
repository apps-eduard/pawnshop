import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MenuItem {
  id: number;
  name: string;
  route: string;
  icon: string;
  parent_id: number | null;
  order_index: number;
  is_active: boolean;
  description?: string;
  parent_name?: string;
  children_count?: number;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MenuConfigService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/menu-config`;

  getMenuItems(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.apiUrl}/menu-items`);
  }

  getParentMenus(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.apiUrl}/parent-menus`);
  }

  getMenuItem(id: number): Observable<MenuItem> {
    return this.http.get<MenuItem>(`${this.apiUrl}/menu-items/${id}`);
  }

  createMenuItem(menu: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.apiUrl}/menu-items`, menu);
  }

  updateMenuItem(id: number, menu: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.apiUrl}/menu-items/${id}`, menu);
  }

  deleteMenuItem(id: number): Observable<{ message: string; deleted: MenuItem }> {
    return this.http.delete<{ message: string; deleted: MenuItem }>(`${this.apiUrl}/menu-items/${id}`);
  }

  reorderMenuItems(items: { id: number; order_index: number }[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/menu-items/reorder`, { items });
  }
}
