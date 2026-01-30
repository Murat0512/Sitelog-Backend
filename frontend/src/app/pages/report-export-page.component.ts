import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { ProjectsService } from '../core/projects.service';
import { LogsService, DailyLog } from '../core/logs.service';
import { FoldersService, LogFolder } from '../core/folders.service';

@Component({
  selector: 'app-report-export-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatListModule
  ],
  templateUrl: './report-export-page.component.html',
  styleUrl: './report-export-page.component.scss'
})
export class ReportExportPageComponent {
  readonly form = this.fb.group({
    folder: ['']
  });

  projectId = '';

  isDownloading = false;
  error = '';
  logs: DailyLog[] = [];
  folders: LogFolder[] = [];
  selectedLogIds = new Set<string>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private logsService: LogsService,
    private foldersService: FoldersService
  ) {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadFolders();
    this.loadLogs();
  }

  loadFolders() {
    if (!this.projectId) return;
    this.foldersService.list(this.projectId).subscribe({
      next: (folders) => {
        this.folders = folders;
      },
      error: () => {
        this.error = 'Unable to load folders.';
      }
    });
  }

  loadLogs() {
    if (!this.projectId) return;
    const folder = this.form.value.folder || undefined;
    this.logsService.list(this.projectId, { folder }).subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.selectedLogIds = new Set(this.logs.map((log) => log._id));
      },
      error: () => {
        this.error = 'Unable to load logs.';
      }
    });
  }

  toggleLog(logId: string, checked: boolean) {
    if (checked) {
      this.selectedLogIds.add(logId);
    } else {
      this.selectedLogIds.delete(logId);
    }
  }

  selectAll() {
    this.selectedLogIds = new Set(this.logs.map((log) => log._id));
  }

  clearSelection() {
    this.selectedLogIds.clear();
  }

  download() {
    const { folder } = this.form.getRawValue();
    this.isDownloading = true;
    this.error = '';

    this.projectsService
      .downloadReport(
        this.projectId,
        undefined,
        undefined,
        folder || undefined,
        Array.from(this.selectedLogIds)
      )
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'project-report.pdf';
          link.click();
          window.URL.revokeObjectURL(url);
          this.isDownloading = false;
        },
        error: (err) => {
          this.isDownloading = false;
          this.error = err?.error?.message || 'Unable to generate report.';
        }
      });
  }

  goBack() {
    this.router.navigate(['/projects', this.projectId]);
  }
}
