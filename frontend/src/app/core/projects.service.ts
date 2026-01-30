import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { Observable } from 'rxjs';

export interface Project {
  _id: string;
  name: string;
  client: string;
  siteAddress: string;
  startDate: string;
  endDate?: string;
  status: string;
  archived: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  constructor(private http: HttpClient) {}

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${API_BASE_URL}/projects`);
  }

  get(id: string): Observable<Project> {
    return this.http.get<Project>(`${API_BASE_URL}/projects/${id}`);
  }

  create(payload: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${API_BASE_URL}/projects`, payload);
  }

  update(id: string, payload: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${API_BASE_URL}/projects/${id}`, payload);
  }

  archive(id: string): Observable<Project> {
    return this.http.patch<Project>(`${API_BASE_URL}/projects/${id}/archive`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/projects/${id}`);
  }

  report(id: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    const query = params.toString();
    return `${API_BASE_URL}/projects/${id}/reports/daily${query ? `?${query}` : ''}`;
  }

  downloadReport(
    id: string,
    startDate?: string,
    endDate?: string,
    folder?: string,
    logIds?: string[]
  ): Observable<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    if (folder) params.set('folder', folder);
    if (logIds && logIds.length) params.set('logIds', logIds.join(','));
    const query = params.toString();
    return this.http.get(`${API_BASE_URL}/projects/${id}/reports/daily${query ? `?${query}` : ''}`,
      { responseType: 'blob' }
    );
  }
}
