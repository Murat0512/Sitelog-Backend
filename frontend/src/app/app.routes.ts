import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { RegisterPageComponent } from './pages/register-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page.component';
import { LandingPageComponent } from './pages/landing-page.component';
import { ProjectsPageComponent } from './pages/projects-page.component';
import { ProjectDetailPageComponent } from './pages/project-detail-page.component';
import { DailyLogDetailPageComponent } from './pages/daily-log-detail-page.component';
import { ReportExportPageComponent } from './pages/report-export-page.component';
import { ProfilePageComponent } from './pages/profile-page.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
	{ path: '', component: LandingPageComponent },
	{ path: 'login', component: LoginPageComponent },
	{ path: 'register', component: RegisterPageComponent },
	{ path: 'forgot-password', component: ForgotPasswordPageComponent },
	{ path: 'reset-password', component: ResetPasswordPageComponent },
	{ path: 'reset-password/:token', component: ResetPasswordPageComponent },
	{ path: 'projects', component: ProjectsPageComponent, canActivate: [authGuard] },
	{ path: 'projects/:id', component: ProjectDetailPageComponent, canActivate: [authGuard] },
	{ path: 'projects/:id/reports', component: ReportExportPageComponent, canActivate: [authGuard] },
	{ path: 'logs/:id', component: DailyLogDetailPageComponent, canActivate: [authGuard] },
	{ path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'projects' }
];
