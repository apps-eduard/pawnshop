import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { LayoutComponent } from './shared/layout/layout';
import { ToastComponent } from './shared/toast/toast.component';
import { ThemeService } from './core/theme/theme';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, LayoutComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  showNavbar = true;

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Initialize theme
    this.themeService.setDarkMode(this.themeService.getCurrentTheme());

    // Hide navbar on login page
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showNavbar = !event.url.includes('/login');
      });
  }
}
