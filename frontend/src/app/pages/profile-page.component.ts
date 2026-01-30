import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, AuthUser } from '../core/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent implements OnInit {
  user: AuthUser | null = null;
  isLoading = false;
  message = '';
  error = '';

  readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  });

  constructor(private auth: AuthService, private fb: FormBuilder, private router: Router) {}

  ngOnInit() {
    this.user = this.auth.currentUser;
    this.refreshProfile();
  }

  refreshProfile() {
    this.isLoading = true;
    this.auth.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Unable to load profile.';
        this.isLoading = false;
      }
    });
  }

  savePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.message = '';

    this.auth.changePassword(currentPassword || '', newPassword || '').subscribe({
      next: (response) => {
        this.message = response.message || 'Password updated.';
        this.passwordForm.reset();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Unable to update password.';
        this.isLoading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/projects']);
  }
}
