import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LogsService, DailyLog, Attachment } from '../core/logs.service';
import { ProjectsService, Project } from '../core/projects.service';
import { FoldersService, LogFolder } from '../core/folders.service';
import { API_BASE_URL } from '../core/api.config';

@Component({
  selector: 'app-daily-log-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule
  ],
  templateUrl: './daily-log-detail-page.component.html',
  styleUrl: './daily-log-detail-page.component.scss'
})
export class DailyLogDetailPageComponent implements OnInit {
  log: DailyLog | null = null;
  project: Project | null = null;
  folders: LogFolder[] = [];
  folderName = '';
  attachments: Attachment[] = [];
  selectedFiles: File[] = [];
  isDragOver = false;
  errorMessage = '';
  editMode = false;
  isSaving = false;
  isExporting = false;

  readonly uploadForm = this.fb.group({
    caption: [''],
    tags: ['']
  });

  readonly editForm = this.fb.group({
    date: [null as Date | null, Validators.required],
    weatherType: [''],
    weatherNotes: [''],
    siteArea: ['', Validators.required],
    activityType: ['', Validators.required],
    folder: [''],
    summary: ['', Validators.required],
    issuesRisks: [''],
    nextSteps: ['']
  });

  readonly activityOptions = [
    'Excavation',
    'Rebar',
    'Concrete Pour',
    'Drainage',
    'Masonry',
    'Inspection',
    'Delivery'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private logsService: LogsService,
    private projectsService: ProjectsService,
    private foldersService: FoldersService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    const logId = this.route.snapshot.paramMap.get('id');
    if (!logId) {
      this.router.navigate(['/projects']);
      return;
    }

    this.loadLog(logId);
    this.loadAttachments(logId);
  }

  loadLog(logId: string) {
    this.logsService.get(logId).subscribe({
      next: (response) => {
        this.log = response.log;
        if (this.log?.project) {
          this.loadProject(this.log.project);
          this.loadFolders(this.log.project);
        }
        if (this.log?.folder) {
          this.folderName = this.resolveFolderName(this.log.folder);
        }
        this.editForm.patchValue({
          date: this.log?.date ? new Date(this.log.date) : null,
          weatherType: this.log?.weather?.type || '',
          weatherNotes: this.log?.weather?.notes || '',
          siteArea: this.log?.siteArea || '',
          activityType: this.log?.activityType || '',
          folder: this.log?.folder || '',
          summary: this.log?.summary || '',
          issuesRisks: this.log?.issuesRisks || '',
          nextSteps: this.log?.nextSteps || ''
        });
      },
      error: () => {
        this.errorMessage = 'Unable to load log.';
      }
    });
  }

  loadProject(projectId: string) {
    this.projectsService.get(projectId).subscribe({
      next: (project) => {
        this.project = project;
      },
      error: () => {
        this.errorMessage = 'Unable to load project.';
      }
    });
  }

  loadFolders(projectId: string) {
    this.foldersService.list(projectId).subscribe({
      next: (folders) => {
        this.folders = folders;
        if (this.log?.folder) {
          this.folderName = this.resolveFolderName(this.log.folder);
        }
      },
      error: () => {
        this.errorMessage = 'Unable to load folders.';
      }
    });
  }

  resolveFolderName(folderId: string) {
    const match = this.folders.find((folder) => folder._id === folderId);
    return match?.name || 'No folder';
  }

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  cancelEdit() {
    if (!this.log) return;
    this.editForm.patchValue({
      date: this.log?.date ? new Date(this.log.date) : null,
      weatherType: this.log?.weather?.type || '',
      weatherNotes: this.log?.weather?.notes || '',
      siteArea: this.log?.siteArea || '',
      activityType: this.log?.activityType || '',
      folder: this.log?.folder || '',
      summary: this.log?.summary || '',
      issuesRisks: this.log?.issuesRisks || '',
      nextSteps: this.log?.nextSteps || ''
    });
    this.editMode = false;
  }

  saveEdit() {
    if (!this.log) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    const dateValue = value.date instanceof Date ? value.date : value.date ? new Date(value.date) : null;
    this.isSaving = true;
    this.logsService
      .update(this.log._id, {
        date: dateValue ? dateValue.toISOString() : this.log.date,
        weather: { type: value.weatherType || '', notes: value.weatherNotes || '' },
        siteArea: value.siteArea || '',
        activityType: value.activityType || '',
        folder: value.folder || '',
        summary: value.summary || '',
        issuesRisks: value.issuesRisks || '',
        nextSteps: value.nextSteps || ''
      })
      .subscribe({
        next: (updated) => {
          this.log = updated;
          this.folderName = updated.folder ? this.resolveFolderName(updated.folder) : 'No folder';
          this.editMode = false;
          this.isSaving = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to update log.';
          this.isSaving = false;
        }
      });
  }

  loadAttachments(logId: string) {
    this.logsService.listAttachments(logId).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
      },
      error: () => {
        this.errorMessage = 'Unable to load attachments.';
      }
    });
  }

  pickFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) {
      this.selectedFiles = files;
    }
  }

  upload() {
    if (!this.log) return;
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Select at least one file to upload.';
      return;
    }

    const caption = this.uploadForm.value.caption || '';
    const tags = this.uploadForm.value.tags || '';

    this.logsService
      .uploadAttachments(
        this.log._id,
        this.selectedFiles,
        this.selectedFiles.map(() => caption),
        this.selectedFiles.map(() => tags)
      )
      .subscribe({
        next: (attachments) => {
          this.attachments = [...attachments, ...this.attachments];
          this.selectedFiles = [];
          this.uploadForm.reset();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to upload attachments.';
        }
      });
  }

  attachmentUrl(attachment: Attachment) {
    if ((attachment as any).fileUrl) {
      const url = (attachment as any).fileUrl as string;
      if (url.startsWith('http')) return url;
      return `${API_BASE_URL.replace('/api', '')}${url}`;
    }
    if (attachment.filename) {
      return `${API_BASE_URL.replace('/api', '')}/uploads/${attachment.filename}`;
    }
    return '';
  }

  isImage(attachment: Attachment) {
    const type = attachment.mimeType || attachment.fileType || '';
    if (type.startsWith('image/')) return true;
    const name = attachment.originalName || attachment.fileName || attachment.filename || '';
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
  }

  addComment(attachment: Attachment, text: string, input: HTMLInputElement) {
    if (!text.trim()) return;
    this.logsService.addComment(attachment._id, text.trim()).subscribe({
      next: (comments) => {
        attachment.comments = comments;
        input.value = '';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to add comment.';
      }
    });
  }

  deleteAttachment(attachment: Attachment) {
    const confirmed = confirm('Delete this attachment? This cannot be undone.');
    if (!confirmed) return;

    this.logsService.deleteAttachment(attachment._id).subscribe({
      next: () => {
        this.attachments = this.attachments.filter((item) => item._id !== attachment._id);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete attachment.';
      }
    });
  }

  exportPdf() {
    if (!this.log) return;
    const projectId = typeof this.log.project === 'string' ? this.log.project : (this.log.project as any)?._id;
    if (!projectId) {
      this.errorMessage = 'Unable to export PDF.';
      return;
    }

    this.isExporting = true;
    this.errorMessage = '';

    this.projectsService
      .downloadReport(projectId, undefined, undefined, undefined, [this.log._id])
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'daily-log-report.pdf';
          link.click();
          window.URL.revokeObjectURL(url);
          this.isExporting = false;
        },
        error: (err) => {
          this.isExporting = false;
          this.errorMessage = err?.error?.message || 'Unable to export PDF.';
        }
      });
  }

  goBack() {
    if (this.log) {
      this.router.navigate(['/projects', this.log.project]);
    } else {
      this.router.navigate(['/projects']);
    }
  }
}
