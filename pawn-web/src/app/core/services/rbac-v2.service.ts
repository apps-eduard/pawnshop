import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

// ============================================
// API Response Wrapper
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// Enhanced Interfaces for Dynamic RBAC System
// ============================================

export interface MenuItem {
  id: number;
  name: string;
  route: string;
  icon: string;
  parent_id: number | null;
  order_index: number;
  is_active: boolean;
  description: string;
  created_at?: string;
  updated_at?: string;
  children?: MenuItem[];
  level?: number;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  role_id: number;
  menu_item_id: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  granted_at?: string;
  granted_by?: number;
}

export interface UserWithRoles {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  branch_id: number;
  roles: RoleAssignment[];
  primary_role?: RoleAssignment;
}

export interface RoleAssignment {
  role_id: number;
  role_name: string;
  role_display_name: string;
  is_primary: boolean;
  assigned_at?: string;
  assigned_by?: number;
}

export interface PermissionMatrix {
  menus: MenuItem[];
  roles: Role[];
  permissions: Map<string, Permission>; // key: "roleId_menuId"
}

export interface AssignRolesRequest {
  role_ids: number[];
  primary_role_id?: number;
  replace?: boolean;
}

// ============================================
// RBAC v2 Service - Dynamic Menu & Roles
// ============================================

@Injectable({
  providedIn: 'root'
})
export class RbacV2Service {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/rbac-v2';

  // ==========================================
  // Menu Management
  // ==========================================

  /**
   * Get all menu items (hierarchical)
   */
  getMenus(): Observable<MenuItem[]> {
    return this.http.get<ApiResponse<MenuItem[]>>(`${this.apiUrl}/menus`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Get menus accessible by a specific user (based on their roles)
   */
  getMenusByUser(userId: number): Observable<MenuItem[]> {
    return this.http.get<ApiResponse<MenuItem[]>>(`${this.apiUrl}/menus/user/${userId}`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Create a new menu item
   */
  createMenu(menu: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.post<ApiResponse<MenuItem>>(`${this.apiUrl}/menus`, menu)
      .pipe(map(response => response.data!));
  }

  /**
   * Update an existing menu item
   */
  updateMenu(menuId: number, menu: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.put<ApiResponse<MenuItem>>(`${this.apiUrl}/menus/${menuId}`, menu)
      .pipe(map(response => response.data!));
  }

  /**
   * Delete a menu item
   */
  deleteMenu(menuId: number): Observable<{ message: string }> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/menus/${menuId}`)
      .pipe(map(response => ({ message: response.message || 'Deleted successfully' })));
  }

  // ==========================================
  // Role Management
  // ==========================================

  /**
   * Get all roles
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Create a new role
   */
  createRole(role: Partial<Role>): Observable<Role> {
    return this.http.post<ApiResponse<Role>>(`${this.apiUrl}/roles`, role)
      .pipe(map(response => response.data!));
  }

  /**
   * Update an existing role
   */
  updateRole(roleId: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<ApiResponse<Role>>(`${this.apiUrl}/roles/${roleId}`, role)
      .pipe(map(response => response.data!));
  }

  /**
   * Delete a role (non-system roles only)
   */
  deleteRole(roleId: number): Observable<{ message: string }> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/roles/${roleId}`)
      .pipe(map(response => ({ message: response.message || 'Deleted successfully' })));
  }

  // ==========================================
  // Permission Management
  // ==========================================

  /**
   * Get permissions for a specific role
   */
  getPermissionsByRole(roleId: number): Observable<Permission[]> {
    return this.http.get<ApiResponse<Permission[]>>(`${this.apiUrl}/permissions/role/${roleId}`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Get permission matrix (all roles × all menus)
   */
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const apiResponse = await firstValueFrom(
      this.http.get<ApiResponse<{ menus: MenuItem[], roles: Role[], permissions: Permission[] }>>(
        `${this.apiUrl}/permissions/matrix`
      )
    );

    const response = apiResponse.data!;

    // Convert permissions array to Map for easy lookup
    const permissionMap = new Map<string, Permission>();
    response.permissions.forEach(perm => {
      const key = `${perm.role_id}_${perm.menu_item_id}`;
      permissionMap.set(key, perm);
    });

    return {
      menus: response.menus,
      roles: response.roles,
      permissions: permissionMap
    };
  }

  /**
   * Update a specific permission
   */
  updatePermission(permission: Permission): Observable<Permission> {
    return this.http.put<ApiResponse<Permission>>(`${this.apiUrl}/permissions`, permission)
      .pipe(map(response => response.data!));
  }

  /**
   * Delete a permission
   */
  deletePermission(roleId: number, menuId: number): Observable<{ message: string }> {
    return this.http.delete<ApiResponse<{ message: string }>>(
      `${this.apiUrl}/permissions/${roleId}/${menuId}`
    ).pipe(map(response => ({ message: response.message || 'Deleted successfully' })));
  }

  // ==========================================
  // User-Role Management (Multi-Role Support)
  // ==========================================

  /**
   * Get all users with their assigned roles
   */
  getUsersWithRoles(): Observable<UserWithRoles[]> {
    return this.http.get<ApiResponse<UserWithRoles[]>>(`${this.apiUrl}/users`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Assign multiple roles to a user
   * @param userId The user ID
   * @param roleIds Array of role IDs to assign
   * @param primaryRoleId Which role should be primary (optional, defaults to first)
   * @param replace If true, removes all existing roles first
   */
  assignRolesToUser(
    userId: number,
    roleIds: number[],
    primaryRoleId?: number,
    replace = true
  ): Observable<{ message: string, assigned_roles: RoleAssignment[] }> {
    const body: AssignRolesRequest = {
      role_ids: roleIds,
      primary_role_id: primaryRoleId,
      replace: replace
    };
    return this.http.post<ApiResponse<{ message: string, assigned_roles: RoleAssignment[] }>>(
      `${this.apiUrl}/users/${userId}/roles`,
      body
    ).pipe(map(response => response.data || { message: response.message || '', assigned_roles: [] }));
  }

  /**
   * Remove a specific role from a user
   */
  removeRoleFromUser(userId: number, roleId: number): Observable<{ message: string }> {
    return this.http.delete<ApiResponse<{ message: string }>>(
      `${this.apiUrl}/users/${userId}/roles/${roleId}`
    ).pipe(map(response => ({ message: response.message || 'Removed successfully' })));
  }

  /**
   * Update a user's primary role
   */
  setPrimaryRole(userId: number, roleId: number): Observable<{ message: string }> {
    return this.http.put<ApiResponse<{ message: string }>>(
      `${this.apiUrl}/users/${userId}/primary-role`,
      { role_id: roleId }
    ).pipe(map(response => ({ message: response.message || 'Updated successfully' })));
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Check if a permission exists in the matrix
   */
  hasPermission(
    matrix: PermissionMatrix,
    roleId: number,
    menuId: number,
    permissionType: 'view' | 'create' | 'edit' | 'delete' = 'view'
  ): boolean {
    const key = `${roleId}_${menuId}`;
    const perm = matrix.permissions.get(key);
    if (!perm) return false;

    switch (permissionType) {
      case 'view': return perm.can_view;
      case 'create': return perm.can_create;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  }

  /**
   * Build hierarchical menu tree from flat list
   */
  buildMenuTree(menus: MenuItem[]): MenuItem[] {
    const menuMap = new Map<number, MenuItem>();
    const rootMenus: MenuItem[] = [];

    // First pass: create map
    menus.forEach(menu => {
      menuMap.set(menu.id, { ...menu, children: [], level: 0 });
    });

    // Second pass: build tree
    menus.forEach(menu => {
      const menuItem = menuMap.get(menu.id)!;
      if (menu.parent_id === null) {
        rootMenus.push(menuItem);
      } else {
        const parent = menuMap.get(menu.parent_id);
        if (parent) {
          parent.children!.push(menuItem);
          menuItem.level = (parent.level || 0) + 1;
        }
      }
    });

    // Sort by order_index
    const sortMenus = (items: MenuItem[]) => {
      items.sort((a, b) => a.order_index - b.order_index);
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortMenus(item.children);
        }
      });
    };

    sortMenus(rootMenus);
    return rootMenus;
  }

  /**
   * Get flat list from hierarchical tree
   */
  flattenMenuTree(tree: MenuItem[]): MenuItem[] {
    const result: MenuItem[] = [];
    const traverse = (items: MenuItem[]) => {
      items.forEach(item => {
        result.push(item);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(tree);
    return result;
  }
}
