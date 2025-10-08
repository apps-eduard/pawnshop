import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Item {
  id?: number;
  ticketId: number;
  itemType: string;
  brand?: string;
  model?: string;
  description: string;
  estimatedValue: number;
  conditionNotes?: string;
  serialNumber?: string;
  weight?: number;
  karat?: number;
  createdAt?: string;
  ticketNumber?: string;
  principalAmount?: number;
  ticketStatus?: string;
  pawnerName?: string;
  pawnerContact?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private readonly API_URL = 'http://localhost:3000/api';
  private apiUrl = `${this.API_URL}/items`;

  constructor(private http: HttpClient) {}

  async getItems(): Promise<ApiResponse<Item[]>> {
    try {
      const response = await this.http.get<ApiResponse<Item[]>>(this.apiUrl).toPromise();
      return response || { success: false, message: 'No response', data: [] };
    } catch (error: any) {
      console.error('Error fetching items:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to fetch items',
        data: []
      };
    }
  }

  async getItem(id: number): Promise<ApiResponse<Item>> {
    try {
      const response = await this.http.get<ApiResponse<Item>>(`${this.apiUrl}/${id}`).toPromise();
      return response || { success: false, message: 'No response', data: null as any };
    } catch (error: any) {
      console.error('Error fetching item:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to fetch item',
        data: null as any
      };
    }
  }

  async createItem(item: Partial<Item>): Promise<ApiResponse<Item>> {
    try {
      const response = await this.http.post<ApiResponse<Item>>(this.apiUrl, item).toPromise();
      return response || { success: false, message: 'No response', data: null as any };
    } catch (error: any) {
      console.error('Error creating item:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to create item',
        data: null as any
      };
    }
  }

  async updateItem(id: number, item: Partial<Item>): Promise<ApiResponse<Item>> {
    try {
      const response = await this.http.put<ApiResponse<Item>>(`${this.apiUrl}/${id}`, item).toPromise();
      return response || { success: false, message: 'No response', data: null as any };
    } catch (error: any) {
      console.error('Error updating item:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to update item',
        data: null as any
      };
    }
  }

  async deleteItem(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).toPromise();
      return response || { success: false, message: 'No response', data: undefined };
    } catch (error: any) {
      console.error('Error deleting item:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to delete item',
        data: undefined
      };
    }
  }

  async getItemsByTicket(ticketId: number): Promise<ApiResponse<Item[]>> {
    try {
      const response = await this.http.get<ApiResponse<Item[]>>(`${this.apiUrl}/ticket/${ticketId}`).toPromise();
      return response || { success: false, message: 'No response', data: [] };
    } catch (error: any) {
      console.error('Error fetching items by ticket:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to fetch items',
        data: []
      };
    }
  }

  async getAuctionItems(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/for-auction/list`).toPromise();
      return response || { success: false, message: 'No response', data: [] };
    } catch (error: any) {
      console.error('Error fetching auction items:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to fetch auction items',
        data: []
      };
    }
  }
}
