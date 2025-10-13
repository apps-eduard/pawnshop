import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuConfigService, MenuItem } from './menu-config.service';

@Component({
  selector: 'app-menu-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-config.html',
  styleUrls: ['./menu-config.css']
})
export class MenuConfigComponent implements OnInit {
  private menuConfigService = inject(MenuConfigService);

  Math = Math;

  menuItems: MenuItem[] = [];
  parentMenus: MenuItem[] = [];
  filteredMenuItems: MenuItem[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Filters
  searchTerm = '';
  filterActive = 'all';
  filterParent = 'all';

  // Modal state
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showIconPicker = false;
  isEditMode = false;

  // Icon picker options
  availableIcons = [
    { emoji: '📊', name: 'Chart/Dashboard' },
    { emoji: '📁', name: 'Folder/Management' },
    { emoji: '💰', name: 'Money/Transactions' },
    { emoji: '👥', name: 'Users/People' },
    { emoji: '🧑‍🤝‍🧑', name: 'Pawner/People' },
    { emoji: '🏠', name: 'House/Address' },
    { emoji: '📦', name: 'Box/Items' },
    { emoji: '🎟️', name: 'Voucher/Ticket' },
    { emoji: '💎', name: 'Diamond/Appraisal' },
    { emoji: '➕', name: 'Plus/Add' },
    { emoji: '💵', name: 'Dollar/Payment' },
    { emoji: '🎁', name: 'Gift/Redeem' },
    { emoji: '🔄', name: 'Refresh/Renew' },
    { emoji: '🔨', name: 'Hammer/Auction' },
    { emoji: '📈', name: 'Reports/Analytics' },
    { emoji: '⚙️', name: 'Settings/Config' },
    { emoji: '🔐', name: 'Lock/Security' },
    { emoji: '📋', name: 'Clipboard/List' },
    { emoji: '🏦', name: 'Bank/Financial' },
    { emoji: '💳', name: 'Credit Card' },
    { emoji: '📱', name: 'Phone/Mobile' },
    { emoji: '🔔', name: 'Bell/Notification' },
    { emoji: '📅', name: 'Calendar/Date' },
    { emoji: '🕐', name: 'Clock/Time' },
    { emoji: '📝', name: 'Note/Document' },
    { emoji: '✅', name: 'Check/Success' },
    { emoji: '❌', name: 'Cross/Cancel' },
    { emoji: '⚠️', name: 'Warning/Alert' },
    { emoji: '🔍', name: 'Search/Find' },
    { emoji: '🌟', name: 'Star/Featured' }
  ];

  // Form data
  menuForm: Partial<MenuItem> = {
    name: '',
    route: '',
    icon: '',
    parent_id: null,
    order_index: undefined,
    description: '',
    is_active: true
  };

  editingMenu: MenuItem | null = null;
  deletingMenu: MenuItem | null = null;

  // Loading states
  isLoading = false;
  isSaving = false;

  // Error handling
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadMenuItems();
    this.loadParentMenus();
  }

  loadMenuItems(): void {
    this.isLoading = true;
    this.menuConfigService.getMenuItems().subscribe({
      next: (items) => {
        this.menuItems = items;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        this.showError('Failed to load menu items');
        this.isLoading = false;
      }
    });
  }

  loadParentMenus(): void {
    this.menuConfigService.getParentMenus().subscribe({
      next: (menus) => {
        this.parentMenus = menus;
      },
      error: (error) => {
        console.error('Error loading parent menus:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.menuItems];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.route.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term))
      );
    }

    // Active filter
    if (this.filterActive !== 'all') {
      const isActive = this.filterActive === 'active';
      filtered = filtered.filter(item => item.is_active === isActive);
    }

    // Parent filter
    if (this.filterParent !== 'all') {
      if (this.filterParent === 'root') {
        filtered = filtered.filter(item => item.parent_id === null);
      } else {
        filtered = filtered.filter(item => item.parent_id?.toString() === this.filterParent);
      }
    }

    this.filteredMenuItems = filtered;
    this.totalPages = Math.ceil(this.filteredMenuItems.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  get paginatedItems(): MenuItem[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredMenuItems.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Create menu
  openCreateModal(): void {
    this.menuForm = {
      name: '',
      route: '',
      icon: '',
      parent_id: null,
      order_index: undefined,
      description: '',
      is_active: true
    };
    this.showCreateModal = true;
    this.errorMessage = '';

    setTimeout(() => {
      const nameInput = document.getElementById('menuName') as HTMLInputElement;
      nameInput?.focus();
    }, 100);
  }

  createMenu(): void {
    if (!this.menuForm.name || !this.menuForm.route || !this.menuForm.icon) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    this.menuConfigService.createMenuItem(this.menuForm).subscribe({
      next: () => {
        this.showSuccess('Menu item created successfully');
        this.loadMenuItems();
        this.loadParentMenus();
        this.closeCreateModal();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error creating menu item:', error);
        this.showError(error.error?.error || 'Failed to create menu item');
        this.isSaving = false;
      }
    });
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.menuForm = {
      name: '',
      route: '',
      icon: '',
      parent_id: null,
      order_index: undefined,
      description: '',
      is_active: true
    };
  }

  // Edit menu
  openEditModal(menu: MenuItem): void {
    this.editingMenu = menu;
    this.menuForm = {
      name: menu.name,
      route: menu.route,
      icon: menu.icon,
      parent_id: menu.parent_id,
      order_index: menu.order_index,
      description: menu.description,
      is_active: menu.is_active
    };
    this.showEditModal = true;
    this.errorMessage = '';

    setTimeout(() => {
      const nameInput = document.getElementById('menuNameEdit') as HTMLInputElement;
      nameInput?.focus();
    }, 100);
  }

  updateMenu(): void {
    if (!this.editingMenu || !this.menuForm.name || !this.menuForm.route || !this.menuForm.icon) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    this.menuConfigService.updateMenuItem(this.editingMenu.id, this.menuForm).subscribe({
      next: () => {
        this.showSuccess('Menu item updated successfully');
        this.loadMenuItems();
        this.loadParentMenus();
        this.closeEditModal();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error updating menu item:', error);
        this.showError(error.error?.error || 'Failed to update menu item');
        this.isSaving = false;
      }
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingMenu = null;
  }

  // Delete menu
  openDeleteModal(menu: MenuItem): void {
    this.deletingMenu = menu;
    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  deleteMenu(): void {
    if (!this.deletingMenu) return;

    this.isSaving = true;
    this.menuConfigService.deleteMenuItem(this.deletingMenu.id).subscribe({
      next: () => {
        this.showSuccess('Menu item deleted successfully');
        this.loadMenuItems();
        this.loadParentMenus();
        this.closeDeleteModal();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error deleting menu item:', error);
        this.showError(error.error?.error || 'Failed to delete menu item');
        this.isSaving = false;
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingMenu = null;
  }

  // Helper methods
  getParentName(parentId: number | null): string {
    if (!parentId) return 'Root Level';
    const parent = this.menuItems.find(m => m.id === parentId);
    return parent ? parent.name : 'Unknown';
  }

  isParentMenu(menu: MenuItem): boolean {
    return menu.parent_id === null;
  }

  showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterActive = 'all';
    this.filterParent = 'all';
    this.applyFilters();
  }

  // Icon picker methods
  openIconPicker(isEdit: boolean = false): void {
    this.isEditMode = isEdit;
    this.showIconPicker = true;
  }

  closeIconPicker(): void {
    this.showIconPicker = false;
  }

  selectIcon(icon: string): void {
    this.menuForm.icon = icon;
    this.closeIconPicker();
  }
}
