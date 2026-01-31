import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'site-tracker-token';
  private readonly userKey = 'site-tracker-user';

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: AuthUser }>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.userKey, JSON.stringify(response.user));
        })
      );
  }

  register(email: string, password: string, role: string = 'member', name?: string) {
    return this.http.post<AuthUser>(`${API_BASE_URL}/auth/register`, {
      name,
      email,
      password,
      role
    });
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  get currentUser(): AuthUser | null {
    const stored = localStorage.getItem(this.userKey);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  }

  getProfile() {
    return this.http.get<AuthUser>(`${API_BASE_URL}/auth/me`).pipe(
      tap((user) => localStorage.setItem(this.userKey, JSON.stringify(user)))
    );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${API_BASE_URL}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  requestPasswordReset(email: string) {
    return this.http.post<{ message: string; resetToken?: string }>(
      `${API_BASE_URL}/auth/forgot-password`,
      { email }
    );
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${API_BASE_URL}/auth/reset-password`, {
      token,
      newPassword
    });
  }

  get isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(this.tokenKey));
  }
}
