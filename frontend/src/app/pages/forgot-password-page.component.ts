import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss'
})
export class ForgotPasswordPageComponent {
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = false;
  error = '';
  success = '';
  resetToken = '';

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.resetToken = '';

    const { email } = this.form.getRawValue();

    this.auth.requestPasswordReset(email || '').subscribe({
      next: (response) => {
        this.loading = false;
        this.success = response.message || 'If an account exists, a reset token has been generated.';
        this.resetToken = response.resetToken || '';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to start password reset.';
      }
    });
  }
}
