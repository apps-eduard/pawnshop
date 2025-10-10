import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RbacV2Service,
  UserWithRoles,
  Role,
  MenuItem,
  PermissionMatrix
} from '../../core/services/rbac-v2.service';

interface EditRolesModal {
  isOpen: boolean;
  user: UserWithRoles | null;
  selectedRoleIds: number[];
  primaryRoleId: number | null;
}

interface RoleFormModal {
  isOpen: boolean;
  isEdit: boolean;
  role: Partial<Role>;
}

interface MenuFormModal {
  isOpen: boolean;
  isEdit: boolean;
  menu: Partial<MenuItem>;
}

@Component({
  selector: 'app-rbac',
  templateUrl: './rbac.component.html',
  styleUrls: ['./rbac.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class RbacComponent implements OnInit {
  private rbacService = inject(RbacV2Service);

  // Tab Management
  activeTab: 'users' | 'roles' | 'menus' | 'permissions' = 'users';
  isLoading = false;

  // Data
  users: UserWithRoles[] = [];
  roles: Role[] = [];
  menus: MenuItem[] = [];
  permissionMatrix: PermissionMatrix | null = null;

  // Modals
  editRolesModal: EditRolesModal = {
    isOpen: false,
    user: null,
    selectedRoleIds: [],
    primaryRoleId: null
  };

  roleFormModal: RoleFormModal = {
    isOpen: false,
    isEdit: false,
    role: {}
  };

  menuFormModal: MenuFormModal = {
    isOpen: false,
    isEdit: false,
    menu: {}
  };

  ngOnInit() {
    this.loadInitialData();
  }

  async loadInitialData() {
    await this.loadUsersWithRoles();
    await this.loadRoles();
  }

  // ==========================================
  // Data Loading
  // ==========================================

  async loadUsersWithRoles() {
    this.isLoading = true;
    try {
      this.users = await this.rbacService.getUsersWithRoles().toPromise() || [];
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      this.isLoading = false;
    }
  }

  async loadRoles() {
    try {
      this.roles = await this.rbacService.getRoles().toPromise() || [];
    } catch (error) {
      console.error('Error loading roles:', error);
      alert('Failed to load roles');
    }
  }

  async loadMenus() {
    if (this.menus.length > 0) return; // Already loaded
    try {
      this.menus = await this.rbacService.getMenus().toPromise() || [];
    } catch (error) {
      console.error('Error loading menus:', error);
      alert('Failed to load menus');
    }
  }

  async loadPermissionMatrix() {
    if (this.permissionMatrix) return; // Already loaded
    this.isLoading = true;
    try {
      this.permissionMatrix = await this.rbacService.getPermissionMatrix();
    } catch (error) {
      console.error('Error loading permission matrix:', error);
      alert('Failed to load permission matrix');
    } finally {
      this.isLoading = false;
    }
  }

  // ==========================================
  // Tab Management
  // ==========================================

  async switchTab(tab: 'users' | 'roles' | 'menus' | 'permissions') {
    this.activeTab = tab;

    // Lazy load data for specific tabs
    if (tab === 'menus') {
      await this.loadMenus();
    } else if (tab === 'permissions') {
      await this.loadMenus();
      await this.loadPermissionMatrix();
    }
  }

  // ==========================================
  // Users Tab - Multi-Role Assignment
  // ==========================================

  openEditRolesModal(user: UserWithRoles) {
    this.editRolesModal = {
      isOpen: true,
      user: user,
      selectedRoleIds: user.roles.map(r => r.role_id),
      primaryRoleId: user.primary_role?.role_id || null
    };
  }

  closeEditRolesModal() {
    this.editRolesModal = {
      isOpen: false,
      user: null,
      selectedRoleIds: [],
      primaryRoleId: null
    };
  }

  toggleRoleSelection(roleId: number) {
    const index = this.editRolesModal.selectedRoleIds.indexOf(roleId);
    if (index > -1) {
      // Remove role
      this.editRolesModal.selectedRoleIds.splice(index, 1);
      // If it was primary, clear primary
      if (this.editRolesModal.primaryRoleId === roleId) {
        this.editRolesModal.primaryRoleId = null;
      }
    } else {
      // Add role
      this.editRolesModal.selectedRoleIds.push(roleId);
      // If no primary set, make this primary
      if (!this.editRolesModal.primaryRoleId) {
        this.editRolesModal.primaryRoleId = roleId;
      }
    }
  }

  setPrimaryRole(roleId: number) {
    this.editRolesModal.primaryRoleId = roleId;
  }

  async saveUserRoles() {
    if (!this.editRolesModal.user) return;

    if (this.editRolesModal.selectedRoleIds.length === 0) {
      alert('Please select at least one role');
      return;
    }

    if (!this.editRolesModal.primaryRoleId) {
      alert('Please select a primary role');
      return;
    }

    try {
      await this.rbacService.assignRolesToUser(
        this.editRolesModal.user.id,
        this.editRolesModal.selectedRoleIds,
        this.editRolesModal.primaryRoleId,
        true // replace existing roles
      ).toPromise();

      alert('✅ User roles updated successfully!');
      this.closeEditRolesModal();
      await this.loadUsersWithRoles();
    } catch (error) {
      console.error('Error updating user roles:', error);
      alert('❌ Failed to update user roles');
    }
  }

  getUserRoleNames(user: UserWithRoles): string {
    return user.roles.map(r => r.role_display_name).join(', ');
  }

  getPrimaryRoleName(user: UserWithRoles): string {
    return user.primary_role?.role_display_name || 'None';
  }

  getRoleColor(roleName: string): string {
    const colors: Record<string, string> = {
      'admin': 'red',
      'administrator': 'red',
      'manager': 'blue',
      'cashier': 'green',
      'auctioneer': 'purple',
      'appraiser': 'yellow',
      'pawner': 'gray'
    };
    return colors[roleName.toLowerCase()] || 'gray';
  }

  // ==========================================
  // Roles Tab - CRUD Operations
  // ==========================================

  openCreateRoleModal() {
    this.roleFormModal = {
      isOpen: true,
      isEdit: false,
      role: {
        name: '',
        display_name: '',
        description: '',
        is_system_role: false
      }
    };
  }

  openEditRoleModal(role: Role) {
    this.roleFormModal = {
      isOpen: true,
      isEdit: true,
      role: { ...role }
    };
  }

  closeRoleFormModal() {
    this.roleFormModal = {
      isOpen: false,
      isEdit: false,
      role: {}
    };
  }

  async saveRole() {
    const role = this.roleFormModal.role;

    if (!role.name || !role.display_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (this.roleFormModal.isEdit && role.id) {
        await this.rbacService.updateRole(role.id, role).toPromise();
        alert('✅ Role updated successfully!');
      } else {
        await this.rbacService.createRole(role).toPromise();
        alert('✅ Role created successfully!');
      }

      this.closeRoleFormModal();
      await this.loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('❌ Failed to save role');
    }
  }

  async deleteRole(role: Role) {
    if (role.is_system_role) {
      alert('Cannot delete system roles');
      return;
    }

    if (!confirm(`Are you sure you want to delete role "${role.display_name}"?`)) {
      return;
    }

    try {
      await this.rbacService.deleteRole(role.id).toPromise();
      alert('✅ Role deleted successfully!');
      await this.loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('❌ Failed to delete role');
    }
  }

  // ==========================================
  // Menus Tab - CRUD Operations
  // ==========================================

  openCreateMenuModal() {
    this.menuFormModal = {
      isOpen: true,
      isEdit: false,
      menu: {
        name: '',
        route: '',
        icon: '',
        parent_id: null,
        order_index: this.menus.length,
        is_active: true,
        description: ''
      }
    };
  }

  openEditMenuModal(menu: MenuItem) {
    this.menuFormModal = {
      isOpen: true,
      isEdit: true,
      menu: { ...menu }
    };
  }

  closeMenuFormModal() {
    this.menuFormModal = {
      isOpen: false,
      isEdit: false,
      menu: {}
    };
  }

  async saveMenu() {
    const menu = this.menuFormModal.menu;

    if (!menu.name || !menu.route) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (this.menuFormModal.isEdit && menu.id) {
        await this.rbacService.updateMenu(menu.id, menu).toPromise();
        alert('✅ Menu updated successfully!');
      } else {
        await this.rbacService.createMenu(menu).toPromise();
        alert('✅ Menu created successfully!');
      }

      this.closeMenuFormModal();
      this.menus = []; // Clear cache
      await this.loadMenus();
    } catch (error) {
      console.error('Error saving menu:', error);
      alert('❌ Failed to save menu');
    }
  }

  async deleteMenu(menu: MenuItem) {
    if (!confirm(`Are you sure you want to delete menu "${menu.name}"?`)) {
      return;
    }

    try {
      await this.rbacService.deleteMenu(menu.id).toPromise();
      alert('✅ Menu deleted successfully!');
      this.menus = []; // Clear cache
      await this.loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('❌ Failed to delete menu. It may have child menus.');
    }
  }

  getParentMenuName(parentId: number | null): string {
    if (!parentId) return '-';
    const parent = this.menus.find(m => m.id === parentId);
    return parent?.name || '-';
  }

  // ==========================================
  // Permissions Tab - Checkbox Matrix
  // ==========================================

  hasPermission(roleId: number, menuId: number, type: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean {
    if (!this.permissionMatrix) return false;
    return this.rbacService.hasPermission(this.permissionMatrix, roleId, menuId, type);
  }

  async togglePermission(roleId: number, menuId: number, type: 'view' | 'create' | 'edit' | 'delete') {
    if (!this.permissionMatrix) return;

    const key = `${roleId}_${menuId}`;
    let permission = this.permissionMatrix.permissions.get(key);

    // Create permission if it doesn't exist
    if (!permission) {
      permission = {
        role_id: roleId,
        menu_item_id: menuId,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      };
    }

    // Toggle the specific permission
    switch (type) {
      case 'view': permission.can_view = !permission.can_view; break;
      case 'create': permission.can_create = !permission.can_create; break;
      case 'edit': permission.can_edit = !permission.can_edit; break;
      case 'delete': permission.can_delete = !permission.can_delete; break;
    }

    try {
      await this.rbacService.updatePermission(permission).toPromise();
      // Update local cache
      this.permissionMatrix.permissions.set(key, permission);
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('❌ Failed to update permission');
    }
  }

  getMenuIndentation(menu: MenuItem): string {
    return menu.level ? `${menu.level * 20}px` : '0px';
  }

  getRoleDisplayName(roleId: number): string {
    return this.roles.find(r => r.id === roleId)?.display_name || '';
  }
}
