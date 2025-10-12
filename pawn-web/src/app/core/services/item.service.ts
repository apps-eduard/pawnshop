import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  private readonly API_URL = environment.apiUrl;
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

  async validateAuctionItem(itemId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.http.get<ApiResponse<any>>(`${this.apiUrl}/for-auction/validate/${itemId}`).toPromise();
      return response || { success: false, message: 'No response', data: null };
    } catch (error: any) {
      console.error('Error validating auction item:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to validate auction item',
        data: null
      };
    }
  }

  async confirmAuctionSale(saleData: {
    itemId: number;
    buyerId?: number | null;
    buyerFirstName: string;
    buyerLastName: string;
    buyerContact?: string;
    saleNotes?: string;
    discountAmount?: number;
    finalPrice: number;
    receivedAmount?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.http.post<ApiResponse<any>>(`${this.apiUrl}/for-auction/confirm-sale`, saleData).toPromise();
      return response || { success: false, message: 'No response', data: null };
    } catch (error: any) {
      console.error('Error confirming auction sale:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to confirm sale',
        data: null
      };
    }
  }

  /**
   * Search for pawners by name or contact number
   */
  async searchPawners(query: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.http.get<ApiResponse<any>>(`${this.apiUrl.replace('/items', '/pawners')}/search?q=${encodeURIComponent(query)}`).toPromise();
      return response || { success: false, message: 'No response', data: [] };
    } catch (error: any) {
      console.error('Error searching pawners:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to search pawners',
        data: []
      };
    }
  }

  /**
   * Get sold items with date filters
   */
  async getSoldItems(params: {
    period?: 'today' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    try {
      let queryParams = new URLSearchParams();
      if (params.period) {
        queryParams.append('period', params.period);
      }
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }

      const response = await this.http.get<ApiResponse<any>>(`${this.apiUrl}/sold-items?${queryParams.toString()}`).toPromise();
      return response || { success: false, message: 'No response', data: null };
    } catch (error: any) {
      console.error('Error fetching sold items:', error);
      return {
        success: false,
        message: error?.error?.message || 'Failed to fetch sold items',
        data: null
      };
    }
  }
}

