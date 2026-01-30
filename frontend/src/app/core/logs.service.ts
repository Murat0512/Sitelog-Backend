import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface DailyLog {
  _id: string;
  project: string;
  folder?: string;
  date: string;
  weather?: { type?: string; notes?: string };
  siteArea: string;
  activityType: string;
  summary: string;
  issuesRisks?: string;
  nextSteps?: string;
  potentialClaim?: boolean;
  delayCause?: string;
  instructionRef?: string;
  impact?: string;
  costNote?: string;
}

export interface Attachment {
  _id: string;
  dailyLog: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  caption?: string;
  tags?: string[];
  uploadedAt: string;
  comments?: Array<{ text: string; authorName?: string; createdAt?: string }>;
}

@Injectable({ providedIn: 'root' })
export class LogsService {
  constructor(private http: HttpClient) {}

  list(
    projectId: string,
    filters: { startDate?: string; endDate?: string; activityType?: string; folder?: string }
  ) {
    let params = new HttpParams();
    if (filters.startDate) params = params.set('from', filters.startDate);
    if (filters.endDate) params = params.set('to', filters.endDate);
    if (filters.activityType) params = params.set('activityType', filters.activityType);
    if (filters.folder) params = params.set('folder', filters.folder);
    return this.http.get<{ logs: DailyLog[]; attachments: Attachment[]; total: number }>(
      `${API_BASE_URL}/projects/${projectId}/logs`,
      { params }
    );
  }

  create(projectId: string, payload: Partial<DailyLog>): Observable<DailyLog> {
    return this.http.post<DailyLog>(`${API_BASE_URL}/projects/${projectId}/logs`, payload);
  }

  uploadAttachments(logId: string, files: File[], captions: string[], tags: string[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    captions.forEach((caption) => formData.append('captions', caption));
    tags.forEach((tag) => formData.append('tags', tag));
    return this.http.post<Attachment[]>(`${API_BASE_URL}/logs/${logId}/attachments`, formData);
  }

  get(logId: string) {
    return this.http.get<{ log: DailyLog; attachments: Attachment[] }>(`${API_BASE_URL}/logs/${logId}`);
  }

  update(logId: string, payload: Partial<DailyLog>) {
    return this.http.put<DailyLog>(`${API_BASE_URL}/logs/${logId}`, payload);
  }

  deleteLog(logId: string) {
    return this.http.delete<void>(`${API_BASE_URL}/logs/${logId}`);
  }

  listAttachments(logId: string) {
    return this.http.get<Attachment[]>(`${API_BASE_URL}/logs/${logId}/attachments`);
  }

  addComment(attachmentId: string, text: string) {
    return this.http.post<Array<{ text: string; authorName?: string; createdAt?: string }>>(
      `${API_BASE_URL}/attachments/${attachmentId}/comments`,
      { text }
    );
  }

  deleteAttachment(attachmentId: string) {
    return this.http.delete<{ message?: string }>(`${API_BASE_URL}/attachments/${attachmentId}`);
  }
}
