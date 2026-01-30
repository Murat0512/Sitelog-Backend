import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ProjectsService, Project } from '../core/projects.service';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatListModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss'
})
export class ProjectsPageComponent implements OnInit {
  projects: Project[] = [];
  isLoading = false;
  errorMessage = '';
  query = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    client: ['', Validators.required],
    siteAddress: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: [''],
    status: ['active']
  });

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.isLoading = true;
    this.projectsService.list().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load projects.';
        this.isLoading = false;
      }
    });
  }

  createProject() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.projectsService
      .create({
        name: value.name || '',
        client: value.client || '',
        siteAddress: value.siteAddress || '',
        startDate: value.startDate || '',
        endDate: value.endDate || undefined,
        status: value.status || 'active'
      })
      .subscribe({
      next: (project) => {
        this.projects = [project, ...this.projects];
        this.form.reset({ status: 'active' });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to create project.';
      }
      });
  }

  openProject(project: Project) {
    this.router.navigate(['/projects', project._id]);
  }

  deleteProject(project: Project) {
    const confirmed = confirm(`Delete project "${project.name}"? This will remove all logs, folders, and attachments.`);
    if (!confirmed) return;

    this.projectsService.delete(project._id).subscribe({
      next: () => {
        this.projects = this.projects.filter((item) => item._id !== project._id);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete project.';
      }
    });
  }

  filteredProjects() {
    const query = this.query.trim().toLowerCase();
    if (!query) return this.projects;

    return this.projects.filter((project) =>
      [project.name, project.client, project.siteAddress]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }

  focusCreate() {
    document.getElementById('create-project-card')?.scrollIntoView({ behavior: 'smooth' });
  }
}
