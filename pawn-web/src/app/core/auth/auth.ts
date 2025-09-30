import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, LoginRequest, LoginResponse, UserRole } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check for existing authentication
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data?.user && response.data?.token) {
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            this.currentUserSubject.next(response.data.user);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getDashboardRoute(): string {
    const user = this.getCurrentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'administrator':
      case UserRole.ADMINISTRATOR:
        return '/admin-dashboard';
      case 'manager':
      case UserRole.MANAGER:
        return '/manager-dashboard';
      case 'cashier':
      case UserRole.CASHIER:
        return '/cashier-dashboard';
      case 'auctioneer':
      case UserRole.AUCTIONEER:
        return '/auctioneer-dashboard';
      case 'appraiser':
      case UserRole.APPRAISER:
        return '/appraiser-dashboard';
      case 'pawner':
      case UserRole.PAWNER:
        return '/pawner-dashboard';
      default:
        console.warn(`Unknown user role: ${user.role}`);
        return '/login';
    }
  }
}
