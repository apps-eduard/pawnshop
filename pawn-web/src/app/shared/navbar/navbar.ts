import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth';
import { ThemeService } from '../../core/theme/theme';
import { User } from '../../core/models/interfaces';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ClickOutsideDirective],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() sidebarOpen = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeSidebar = new EventEmitter<void>();

  currentUser: User | null = null;
  isDarkMode = false;
  userMenuOpen = false;
  isOnLoginPage = false;
  isOnTransactionPage = false;
  currentDateTime = new Date();
  currentPageTitle = '';
  currentBranchName = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router,
    private location: Location,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadCurrentBranch();
        }
      });

    // Subscribe to theme changes
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDark => {
        this.isDarkMode = isDark;
      });

    // Track current route to hide login button on login page
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.isOnLoginPage = event.url === '/login' || event.url.startsWith('/login');
        this.isOnTransactionPage = event.url.includes('/transactions/');
        this.setPageTitle(event.url);
      });

    // Set initial state
    this.isOnLoginPage = this.router.url === '/login' || this.router.url.startsWith('/login');
    this.isOnTransactionPage = this.router.url.includes('/transactions/');

    // Set initial page title based on current URL
    this.setPageTitle(this.router.url);

    // Update current time every minute
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 60000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
    this.userMenuOpen = false;
    this.onCloseSidebar();
    this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const firstInitial = this.currentUser.firstName?.charAt(0) || '';
    const lastInitial = this.currentUser.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onCloseSidebar(): void {
    this.closeSidebar.emit();
  }

  getDashboardRoute(): string {
    return this.authService.getDashboardRoute();
  }

  // Close menus when clicking outside
  onClickOutside(): void {
    this.userMenuOpen = false;
  }

  // Go back navigation
  goBack(): void {
    this.location.back();
  }

  // Set page title based on URL
  private setPageTitle(url: string): void {
    if (url.includes('/appraiser-dashboard')) {
      this.currentPageTitle = 'Appraiser Dashboard';
    } else if (url.includes('/manager-dashboard')) {
      this.currentPageTitle = 'Manager Dashboard';
    } else if (url.includes('/auctioneer-dashboard')) {
      this.currentPageTitle = 'Auctioneer Dashboard';
    } else if (url.includes('/cashier-dashboard')) {
      this.currentPageTitle = 'Cashier Dashboard';
    } else if (url.includes('/admin-dashboard')) {
      this.currentPageTitle = 'Admin Dashboard';
    } else if (url.includes('/admin-settings')) {
      this.currentPageTitle = 'Admin Settings';
    } else if (url.includes('/transactions/appraisal')) {
      this.currentPageTitle = 'Create Appraisal';
    } else if (url.includes('/transactions/')) {
      this.currentPageTitle = 'Transaction';
    } else {
      this.currentPageTitle = '';
    }
  }

  // Load current branch information
  private loadCurrentBranch(): void {
    this.http.get<{success: boolean, data: any}>('http://localhost:3000/api/branch-config/current').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentBranchName = response.data.name;
        }
      },
      error: (error) => {
        console.error('Error loading current branch:', error);
        this.currentBranchName = '';
      }
    });
  }
}
