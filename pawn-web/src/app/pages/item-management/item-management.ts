import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../core/services/item.service';
import { ToastService } from '../../core/services/toast.service';

interface Item {
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
  isEditing?: boolean;
}

@Component({
  selector: 'app-item-management',
  templateUrl: './item-management.html',
  styleUrls: ['./item-management.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ItemManagementComponent implements OnInit {
  items: Item[] = [];
  showAddForm = false;
  loading = false;

  newItem: Item = {
    ticketId: 0,
    itemType: '',
    brand: '',
    model: '',
    description: '',
    estimatedValue: 0,
    conditionNotes: '',
    serialNumber: '',
    weight: undefined,
    karat: undefined
  };

  itemTypes = [
    'Jewelry - Gold',
    'Jewelry - Silver',
    'Jewelry - Platinum',
    'Electronics - Mobile Phone',
    'Electronics - Laptop',
    'Electronics - Watch',
    'Electronics - Camera',
    'Electronics - Audio Equipment',
    'Home Appliances',
    'Tools',
    'Motorcycle',
    'Bicycle',
    'Other'
  ];

  constructor(
    private itemService: ItemService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadItems();
  }

  async loadItems() {
    try {
      this.loading = true;
      console.log('Loading items...');

      const response = await this.itemService.getItems();
      if (response.success) {
        this.items = response.data.map((item: any) => ({
          ...item,
          isEditing: false
        }));
        console.log(`✅ Loaded ${this.items.length} items`);
      } else {
        console.error('Failed to load items:', response.message);
        this.toastService.showError('Load Error', 'Failed to load items');
      }
    } catch (error) {
      console.error('Error loading items:', error);
      this.toastService.showError('Load Error', 'Error loading items');
    } finally {
      this.loading = false;
    }
  }

  async onSubmitItem() {
    try {
      if (!this.newItem.ticketId || !this.newItem.itemType || !this.newItem.description || !this.newItem.estimatedValue) {
        this.toastService.showWarning('Validation Error', 'Please fill in all required fields');
        return;
      }

      console.log('Creating item:', this.newItem);

      const response = await this.itemService.createItem(this.newItem);
      if (response.success) {
        this.toastService.showSuccess('Success', 'Item created successfully');
        this.resetForm();
        this.loadItems();
      } else {
        console.error('Failed to create item:', response.message);
        this.toastService.showError('Create Error', response.message || 'Failed to create item');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      this.toastService.showError('Create Error', 'Error creating item');
    }
  }

  async updateItem(item: Item) {
    try {
      if (!item.id) return;

      console.log('Updating item:', item.id);

      const response = await this.itemService.updateItem(item.id, item);
      if (response.success) {
        this.toastService.showSuccess('Success', 'Item updated successfully');
        item.isEditing = false;
        this.loadItems();
      } else {
        console.error('Failed to update item:', response.message);
        this.toastService.showError('Update Error', response.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      this.toastService.showError('Update Error', 'Error updating item');
    }
  }

  async deleteItem(item: Item) {
    if (!item.id) return;

    if (!confirm(`Are you sure you want to delete this ${item.itemType}?`)) {
      return;
    }

    try {
      console.log('Deleting item:', item.id);

      const response = await this.itemService.deleteItem(item.id);
      if (response.success) {
        this.toastService.showSuccess('Success', 'Item deleted successfully');
        this.loadItems();
      } else {
        console.error('Failed to delete item:', response.message);
        this.toastService.showError('Delete Error', response.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      this.toastService.showError('Delete Error', 'Error deleting item');
    }
  }

  toggleEdit(item: Item) {
    item.isEditing = !item.isEditing;
  }

  cancelEdit(item: Item) {
    item.isEditing = false;
    // Reload to reset any changes
    this.loadItems();
  }

  resetForm() {
    this.newItem = {
      ticketId: 0,
      itemType: '',
      brand: '',
      model: '',
      description: '',
      estimatedValue: 0,
      conditionNotes: '',
      serialNumber: '',
      weight: undefined,
      karat: undefined
    };
    this.showAddForm = false;
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  getStatusBadgeClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'redeemed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'renewed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'auctioned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }
}
