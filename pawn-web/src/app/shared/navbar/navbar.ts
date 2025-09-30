import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
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
  currentDateTime = new Date();
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
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
      .subscribe((event: NavigationEnd) => {
        this.isOnLoginPage = event.url === '/login' || event.url.startsWith('/login');
      });

    // Set initial state
    this.isOnLoginPage = this.router.url === '/login' || this.router.url.startsWith('/login');

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
}
