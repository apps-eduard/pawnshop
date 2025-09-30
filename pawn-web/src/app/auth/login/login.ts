import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth';
import { LoginRequest } from '../../core/models/interfaces';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // Demo accounts for testing (matching database usernames)
  demoAccounts = [
    {
      role: 'Administrator',
      username: 'admin',
      password: 'admin123',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: '⚡',
      description: 'Full system access'
    },
    {
      role: 'Manager',
      username: 'manager1',
      password: 'manager123',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      icon: '👔',
      description: 'Branch management'
    },
    {
      role: 'Cashier',
      username: 'cashier1',
      password: 'cashier123',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: '💰',
      description: 'Process transactions'
    },
    {
      role: 'Auctioneer',
      username: 'auctioneer1',
      password: 'auctioneer123',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: '🔨',
      description: 'Manage auctions'
    },
    {
      role: 'Appraiser',
      username: 'appraiser1',
      password: 'appraiser123',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: '💎',
      description: 'Item appraisal'
    },
    {
      role: 'Pawner',
      username: 'pawner1',
      password: 'pawner123',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      icon: '👤',
      description: 'Customer access'
    }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.authService.getDashboardRoute()]);
    }
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials: LoginRequest = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          // Navigate to appropriate dashboard based on user role
          this.router.navigate([this.authService.getDashboardRoute()]);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
          console.error('Login error:', error);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  fillDemoAccount(account: any): void {
    this.loginForm.patchValue({
      username: account.username,
      password: account.password
    });
    // Clear any previous error messages
    this.errorMessage = '';
  }

  // Demo login methods for quick testing
  loginAsAdmin(): void {
    this.loginForm.patchValue({
      username: 'admin',
      password: 'admin123'
    });
    this.onSubmit();
  }

  loginAsCashier(): void {
    this.loginForm.patchValue({
      username: 'cashier1',
      password: 'cashier123'
    });
    this.onSubmit();
  }

  loginAsPawner(): void {
    this.loginForm.patchValue({
      username: 'pawner1',
      password: 'pawner123'
    });
    this.onSubmit();
  }
}