import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ProjectsService, Project } from '../core/projects.service';
import { LogsService, DailyLog, Attachment } from '../core/logs.service';
import { FoldersService, LogFolder } from '../core/folders.service';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatTooltipModule,
    MatAutocompleteModule,
    RouterLink
  ],
  templateUrl: './project-detail-page.component.html',
  styleUrl: './project-detail-page.component.scss'
})
export class ProjectDetailPageComponent implements OnInit {
  project: Project | null = null;
  logs: DailyLog[] = [];
  attachments: Attachment[] = [];
  folders: LogFolder[] = [];
  selectedFiles: File[] = [];
  isUploading = false;
  successMessage = '';
  highlightLogId = '';
  isDragOver = false;

  isLoading = false;
  errorMessage = '';

  readonly filterForm = this.fb.group({
    startDate: [''],
    endDate: [''],
    activityType: [''],
    folder: ['']
  });

  readonly logForm = this.fb.group({
    date: ['', Validators.required],
    weatherType: ['sunny'],
    weatherNotes: [''],
    siteArea: ['', Validators.required],
    activityType: ['', Validators.required],
    folder: [''],
    summary: ['', Validators.required],
    issuesRisks: [''],
    nextSteps: ['']
  });

  readonly folderForm = this.fb.group({
    name: ['', Validators.required]
  });

  readonly uploadForm = this.fb.group({
    caption: [''],
    tags: ['']
  });

  readonly activityOptions = [
    { label: 'Excavation', value: 'excavation' },
    { label: 'Rebar', value: 'rebar' },
    { label: 'Concrete Pour', value: 'concrete_pour' },
    { label: 'Drainage', value: 'drainage' },
    { label: 'Masonry', value: 'masonry' },
    { label: 'Inspection', value: 'inspection' },
    { label: 'Delivery', value: 'delivery' },
    { label: 'Other', value: 'other' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private logsService: LogsService,
    private foldersService: FoldersService
  ) {}

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.router.navigate(['/projects']);
      return;
    }

    this.loadProject(projectId);
    this.loadFolders(projectId);
    this.loadLogs(projectId);
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

  loadLogs(projectId: string) {
    this.isLoading = true;
    const filters = this.filterForm.getRawValue();
    this.logsService
      .list(projectId, {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        activityType: filters.activityType || undefined,
        folder: filters.folder || undefined
      })
      .subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.attachments = response.attachments;
          if (!this.logs.length) {
            this.successMessage = '';
            this.highlightLogId = '';
          }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load logs.';
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    if (!this.project) return;
    this.loadLogs(this.project._id);
  }

  goBack() {
    this.router.navigate(['/projects']);
  }

  createLog() {
    if (!this.project) return;
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    const formValue = this.logForm.getRawValue();
    const dateValue =
      formValue.date instanceof Date
        ? formValue.date.toISOString()
        : formValue.date
          ? new Date(formValue.date).toISOString()
          : '';

    this.errorMessage = '';
    this.successMessage = '';

    const normalizedActivity = this.normalizeActivityType(formValue.activityType || '');

    this.logsService
      .create(this.project._id, {
        date: dateValue,
        weather: { condition: formValue.weatherType || 'sunny', notes: formValue.weatherNotes || '' },
        siteArea: formValue.siteArea || '',
        activityType: normalizedActivity,
        folder: formValue.folder || undefined,
        summary: formValue.summary || '',
        issuesRisks: formValue.issuesRisks || '',
        nextSteps: formValue.nextSteps || ''
      })
      .subscribe({
        next: (log) => {
          this.logs = [log, ...this.logs];
          this.logForm.reset({ weatherType: 'sunny', folder: '' });
          this.successMessage = 'Daily log created successfully.';
          this.highlightLogId = log._id;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to create log.';
        }
      });
  }

  pickFiles(event: Event, log: DailyLog) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.selectedFiles = files;
    if (files.length) {
      this.upload(log);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent, log: DailyLog) {
    event.preventDefault();
    this.isDragOver = false;
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) {
      this.selectedFiles = files;
      this.upload(log);
    }
  }

  upload(log: DailyLog) {
    if (!this.project) return;
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Select at least one file to upload.';
      return;
    }
    if (this.isUploading) return;

    const caption = this.uploadForm.value.caption || '';
    const tags = this.uploadForm.value.tags || '';

    const captions = this.selectedFiles.map(() => caption);
    const tagList = this.selectedFiles.map(() => tags);

    this.isUploading = true;

    this.logsService.uploadAttachments(log._id, this.selectedFiles, captions, tagList).subscribe({
      next: (attachments) => {
        this.attachments = [...attachments, ...this.attachments];
        this.selectedFiles = [];
        this.uploadForm.reset();
        this.isUploading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to upload attachments.';
        this.isUploading = false;
      }
    });
  }

  attachmentsFor(logId: string) {
    return this.attachments.filter((attachment) => attachment.dailyLog === logId);
  }

  private normalizeActivityType(value: string) {
    if (!value) return '';
    const match = this.activityOptions.find((option) => option.value === value || option.label === value);
    if (match) return match.value;
    return value.toLowerCase().replace(/\s+/g, '_');
  }

  loadFolders(projectId: string) {
    this.foldersService.list(projectId).subscribe({
      next: (folders) => {
        this.folders = folders;
      },
      error: () => {
        this.errorMessage = 'Unable to load folders.';
      }
    });
  }

  createFolder() {
    if (!this.project) return;
    if (this.folderForm.invalid) {
      this.folderForm.markAllAsTouched();
      return;
    }

    const { name } = this.folderForm.getRawValue();
    this.foldersService.create(this.project._id, name || '').subscribe({
      next: (folder) => {
        this.folders = [folder, ...this.folders];
        this.folderForm.reset();
        this.logForm.patchValue({ folder: folder._id });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to create folder.';
      }
    });
  }

  selectFolder(folderId: string) {
    this.logForm.patchValue({ folder: folderId });
  }

  deleteFolder(folder: LogFolder, event?: Event) {
    event?.stopPropagation();
    const confirmed = confirm(`Delete folder "${folder.name}"?`);
    if (!confirmed) return;

    this.foldersService.delete(folder._id).subscribe({
      next: () => {
        this.folders = this.folders.filter((item) => item._id !== folder._id);
        if (this.logForm.value.folder === folder._id) {
          this.logForm.patchValue({ folder: '' });
        }
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete folder.';
      }
    });
  }

  selectedFolderName() {
    const selectedId = this.logForm.value.folder;
    if (!selectedId) return 'No folder selected';
    const match = this.folders.find((folder) => folder._id === selectedId);
    return match?.name || 'Selected folder';
  }

  attachmentCount(logId: string) {
    return this.attachmentsFor(logId).length;
  }

  deleteLog(log: DailyLog) {
    const confirmed = confirm('Delete this log entry? This cannot be undone.');
    if (!confirmed) return;

    this.logsService.deleteLog(log._id).subscribe({
      next: () => {
        this.logs = this.logs.filter((item) => item._id !== log._id);
        this.attachments = this.attachments.filter((item) => item.dailyLog !== log._id);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete log.';
      }
    });
  }

  
}
