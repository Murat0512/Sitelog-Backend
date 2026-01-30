import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface LogFolder {
  _id: string;
  project: string;
  name: string;
  createdBy: string;
}

@Injectable({ providedIn: 'root' })
export class FoldersService {
  constructor(private http: HttpClient) {}

  list(projectId: string): Observable<LogFolder[]> {
    return this.http.get<LogFolder[]>(`${API_BASE_URL}/projects/${projectId}/folders`);
  }

  create(projectId: string, name: string): Observable<LogFolder> {
    return this.http.post<LogFolder>(`${API_BASE_URL}/projects/${projectId}/folders`, { name });
  }

  delete(folderId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/folders/${folderId}`);
  }
}
