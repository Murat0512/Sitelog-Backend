import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  isAuthRoute = false;
  isWideRoute = false;
  user = this.auth.currentUser;

  constructor(private auth: AuthService, private router: Router) {
    this.isAuthRoute = this.isAuthScreen(this.router.url);
    this.isWideRoute = this.isWideScreen(this.router.url);

    if (this.auth.isAuthenticated) {
      this.auth.getProfile().subscribe({
        next: (user) => {
          this.user = user;
        },
        error: () => {
          this.user = this.auth.currentUser;
        }
      });
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isAuthRoute = this.isAuthScreen(event.urlAfterRedirects);
        this.isWideRoute = this.isWideScreen(event.urlAfterRedirects);
        this.user = this.auth.currentUser;
      });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private isAuthScreen(url: string) {
    return (
      url === '/' ||
      url.startsWith('/login') ||
      url.startsWith('/register') ||
      url.startsWith('/forgot-password') ||
      url.startsWith('/reset-password')
    );
  }

  private isWideScreen(url: string) {
    return url.startsWith('/projects/') || url.startsWith('/logs/');
  }
}
