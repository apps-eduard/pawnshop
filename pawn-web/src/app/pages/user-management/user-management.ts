import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { AddressService } from '../../core/services/address.service';
import { ToastService } from '../../core/services/toast.service';
import { User, UserRole, City, Barangay } from '../../core/models/interfaces';

interface UserWithActions extends User {
  isEditing?: boolean;
  originalData?: User;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: UserWithActions[] = [];
  filteredUsers: UserWithActions[] = [];
  isLoading = false;
  showAddForm = false;
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';

  userForm: FormGroup;
  editingUserId: number | null = null;

  // Address management
  cities: City[] = [];
  barangays: Barangay[] = [];
  selectedCityId: number | null = null;

  // Available roles for dropdown
  roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'appraiser', label: 'Appraiser' },
    { value: 'auctioneer', label: 'Auctioneer' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private addressService: AddressService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      role: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      position: [''],
      contactNumber: [''],
      cityId: [''],
      barangayId: [''],
      address: [''],
      isActive: [true]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadCities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Password match validator
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  // Load all users
  loadUsers(): void {
    this.isLoading = true;
    console.log('Loading users...');
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Users response:', response);
          if (response.success) {
            this.users = response.data.map(user => ({ ...user, isEditing: false }));
            this.applyFilters();
            console.log('Loaded users:', this.users.length);
          } else {
            console.error('Failed to load users:', response.message);
            this.toastService.showError('Error!', 'Failed to load users');
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.toastService.showError('Error!', 'Failed to load users');
          this.isLoading = false;
        }
      });
  }

  // Apply search and filters
  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm ||
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = !this.selectedRole || user.role === this.selectedRole;

      const matchesStatus = !this.selectedStatus ||
        (this.selectedStatus === 'active' && user.isActive) ||
        (this.selectedStatus === 'inactive' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  // Search users
  onSearch(): void {
    this.applyFilters();
  }

  // Filter by role
  onRoleFilter(): void {
    this.applyFilters();
  }

  // Filter by status
  onStatusFilter(): void {
    this.applyFilters();
  }

  // Show add user form
  showAddUserForm(): void {
    this.showAddForm = true;
    this.editingUserId = null;
    this.userForm.reset();
    this.userForm.patchValue({ isActive: true });
  }

  // Hide add user form
  hideAddUserForm(): void {
    this.showAddForm = false;
    this.userForm.reset();
  }

  // Submit user form (create new user)
  onSubmitUser(): void {
    if (this.userForm.valid) {
      const userData = { ...this.userForm.value };
      delete userData.confirmPassword; // Remove confirm password from payload
      console.log('Submitting user data:', userData);

      this.userService.createUser(userData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('User creation response:', response);
            if (response.success) {
              this.toastService.showSuccess('Success!', 'User created successfully');
              this.loadUsers(); // Reload users list
              this.hideAddUserForm();
              this.userForm.reset({ isActive: true });
            } else {
              this.toastService.showError('Error!', response.message || 'Failed to create user');
            }
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.toastService.showError('Error!', error.error?.message || 'Failed to create user');
          }
        });
    } else {
      this.toastService.showWarning('Validation Error', 'Please fill in all required fields');
      console.log('Form is invalid:', this.userForm.errors);
    }
  }

  // Start editing user
  startEdit(user: UserWithActions): void {
    user.isEditing = true;
    user.originalData = { ...user };
  }

  // Cancel editing
  cancelEdit(user: UserWithActions): void {
    if (user.originalData) {
      Object.assign(user, user.originalData);
      user.originalData = undefined;
    }
    user.isEditing = false;
  }

  // Save user changes
  saveUser(user: UserWithActions): void {
    const userData = {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      position: user.position,
      contactNumber: user.contactNumber,
      address: user.address,
      isActive: user.isActive
    };

    this.userService.updateUser(user.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            user.isEditing = false;
            user.originalData = undefined;
            // TODO: Show success message
          }
        },
        error: (error) => {
          console.error('Error updating user:', error);
          // TODO: Show error message
        }
      });
  }

  // Toggle user status
  toggleUserStatus(user: UserWithActions): void {
    const newStatus = !user.isActive;

    this.userService.updateUser(user.id, { isActive: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            user.isActive = newStatus;
            // TODO: Show success message
          }
        },
        error: (error) => {
          console.error('Error updating user status:', error);
          // TODO: Show error message
        }
      });
  }

  // Reset user password
  resetPassword(user: UserWithActions): void {
    if (confirm(`Reset password for ${user.username}?`)) {
      this.userService.resetPassword(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert(`Password reset successfully. New password: ${response.data.newPassword}`);
            }
          },
          error: (error) => {
            console.error('Error resetting password:', error);
            // TODO: Show error message
          }
        });
    }
  }

  // Delete user
  deleteUser(user: UserWithActions): void {
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadUsers(); // Reload users list
              // TODO: Show success message
            }
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            // TODO: Show error message
          }
        });
    }
  }

  // Get role display name
  getRoleDisplayName(role: string): string {
    const roleObj = this.roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  }

  // Get user initials
  getUserInitials(user: UserWithActions): string {
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  // Get status badge class
  getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  // Get role badge class
  getRoleBadgeClass(role: string): string {
    const roleClasses = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      cashier: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      appraiser: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      auctioneer: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return roleClasses[role as keyof typeof roleClasses] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  // Load cities for address selection
  loadCities(): void {
    this.addressService.getCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.cities = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading cities:', error);
        }
      });
  }

  // Load barangays for selected city
  onCityChange(): void {
    const cityId = this.userForm.get('cityId')?.value;
    if (cityId) {
      this.selectedCityId = parseInt(cityId);
      this.addressService.getBarangaysByCity(this.selectedCityId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.barangays = response.data;
              // Reset barangay selection when city changes
              this.userForm.patchValue({ barangayId: '' });
            }
          },
          error: (error) => {
            console.error('Error loading barangays:', error);
            this.barangays = [];
          }
        });
    } else {
      this.barangays = [];
      this.selectedCityId = null;
      this.userForm.patchValue({ barangayId: '' });
    }
  }
}
