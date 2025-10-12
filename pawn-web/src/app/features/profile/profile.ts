import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  position?: string;
  mobileNumber?: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
  branchName?: string;
  createdAt: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  isLoadingProfile = false;
  isUpdatingProfile = false;
  isChangingPassword = false;
  
  profileMessage = '';
  passwordMessage = '';
  profileError = '';
  passwordError = '';
  
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  profileData: ProfileData | null = null;
  
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadProfile();
  }

  private initializeForms(): void {
    // Profile form
    this.profileForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      mobileNumber: [''],
      contactNumber: [''],
      address: ['']
    });

    // Password form
    this.passwordForm = this.formBuilder.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  loadProfile(): void {
    this.isLoadingProfile = true;
    this.profileError = '';
    
    this.http.get<{ success: boolean; data: ProfileData }>(`${this.apiUrl}/profile`)
      .subscribe({
        next: (response) => {
          this.isLoadingProfile = false;
          if (response.success && response.data) {
            this.profileData = response.data;
            this.profileForm.patchValue({
              email: response.data.email,
              firstName: response.data.firstName,
              lastName: response.data.lastName,
              mobileNumber: response.data.mobileNumber || '',
              contactNumber: response.data.contactNumber || '',
              address: response.data.address || ''
            });
          }
        },
        error: (error) => {
          this.isLoadingProfile = false;
          this.profileError = error.error?.message || 'Failed to load profile';
          console.error('Error loading profile:', error);
        }
      });
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isUpdatingProfile = true;
    this.profileMessage = '';
    this.profileError = '';

    const formData = this.profileForm.value;

    this.http.put<{ success: boolean; message: string; data: ProfileData }>(
      `${this.apiUrl}/profile`,
      formData
    ).subscribe({
      next: (response) => {
        this.isUpdatingProfile = false;
        if (response.success) {
          this.profileMessage = 'Profile updated successfully!';
          this.profileData = response.data;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.profileMessage = '';
          }, 3000);
        }
      },
      error: (error) => {
        this.isUpdatingProfile = false;
        this.profileError = error.error?.message || 'Failed to update profile';
        console.error('Error updating profile:', error);
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isChangingPassword = true;
    this.passwordMessage = '';
    this.passwordError = '';

    const userId = this.profileData?.id;
    const { oldPassword, newPassword } = this.passwordForm.value;

    this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/${userId}/change-password`,
      { oldPassword, newPassword }
    ).subscribe({
      next: (response) => {
        this.isChangingPassword = false;
        if (response.success) {
          this.passwordMessage = 'Password changed successfully!';
          this.passwordForm.reset();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.passwordMessage = '';
          }, 3000);
        }
      },
      error: (error) => {
        this.isChangingPassword = false;
        this.passwordError = error.error?.message || 'Failed to change password';
        console.error('Error changing password:', error);
      }
    });
  }

  togglePasswordVisibility(field: 'old' | 'new' | 'confirm'): void {
    switch (field) {
      case 'old':
        this.showOldPassword = !this.showOldPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'administrator': 'Administrator',
      'manager': 'Manager',
      'cashier': 'Cashier',
      'appraiser': 'Appraiser',
      'auctioneer': 'Auctioneer',
      'pawner': 'Pawner'
    };
    return roleMap[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const classMap: { [key: string]: string } = {
      'administrator': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'cashier': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'appraiser': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'auctioneer': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'pawner': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
    };
    return classMap[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}
