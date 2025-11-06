import type { DiaryEntry, CreateDiaryRequest, UpdateDiaryRequest } from '../../types/diary';
import { mockApi } from '../../libraries/mockApi';

export interface AnalysisJobResponse {
  jobId: string;
  status: string;
  message?: string;
}

export interface AnalysisStatusResponse {
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress?: number;
  diary?: DiaryEntry;
}

export interface DiaryRepository {
  getDiaries(): Promise<DiaryEntry[]>;
  getDiary(id: string): Promise<DiaryEntry | null>;
  createDiary(data: CreateDiaryRequest): Promise<DiaryEntry>;
  updateDiary(id: string, data: UpdateDiaryRequest): Promise<DiaryEntry | null>;
  deleteDiary(id: string): Promise<boolean>;
  analyzeDiary(id: string): Promise<DiaryEntry | null>;
  startAnalysis(id: string): Promise<AnalysisJobResponse>;
  checkAnalysisStatus(id: string, jobId: string): Promise<AnalysisStatusResponse>;
}

// 本番環境ではAPIを使用、開発環境ではモックを使用
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:8080');

// デバッグ用ログ（削除予定）
console.log('API Configuration:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  API_BASE_URL,
});

const USE_MOCK = process.env.NODE_ENV === 'development';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  async getDiaries(): Promise<DiaryEntry[]> {
    return this.request<DiaryEntry[]>('/diary');
  }

  async getDiary(id: string): Promise<DiaryEntry | null> {
    try {
      return await this.request<DiaryEntry>(`/diary/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createDiary(data: CreateDiaryRequest): Promise<DiaryEntry> {
    return this.request<DiaryEntry>('/diary', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDiary(id: string, data: UpdateDiaryRequest): Promise<DiaryEntry | null> {
    try {
      return await this.request<DiaryEntry>(`/diary/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async deleteDiary(id: string): Promise<boolean> {
    try {
      await this.request(`/diary/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  async analyzeDiary(id: string): Promise<DiaryEntry | null> {
    try {
      return await this.request<DiaryEntry>(`/diary/${id}/analyze`, {
        method: 'POST',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async startAnalysis(id: string): Promise<AnalysisJobResponse> {
    return this.request<AnalysisJobResponse>(`/diary/${id}/analyze`, {
      method: 'POST',
    });
  }

  async checkAnalysisStatus(id: string, jobId: string): Promise<AnalysisStatusResponse> {
    return this.request<AnalysisStatusResponse>(`/diary/${id}/analyze/status/${jobId}`);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export const diaryRepository: DiaryRepository = USE_MOCK ? {
  getDiaries: () => mockApi.getDiaries(),
  getDiary: (id: string) => mockApi.getDiary(id),
  createDiary: (data: CreateDiaryRequest) => mockApi.createDiary(data),
  updateDiary: (id: string, data: UpdateDiaryRequest) => mockApi.updateDiary(id, data),
  deleteDiary: (id: string) => mockApi.deleteDiary(id),
  analyzeDiary: (id: string) => mockApi.analyzeDiary(id),
  startAnalysis: (id: string) => mockApi.startAnalysis(id),
  checkAnalysisStatus: (id: string, jobId: string) => mockApi.checkAnalysisStatus(id, jobId)
} : {
  getDiaries: () => apiClient.getDiaries(),
  getDiary: (id: string) => apiClient.getDiary(id),
  createDiary: (data: CreateDiaryRequest) => apiClient.createDiary(data),
  updateDiary: (id: string, data: UpdateDiaryRequest) => apiClient.updateDiary(id, data),
  deleteDiary: (id: string) => apiClient.deleteDiary(id),
  analyzeDiary: (id: string) => apiClient.analyzeDiary(id),
  startAnalysis: (id: string) => apiClient.startAnalysis(id),
  checkAnalysisStatus: (id: string, jobId: string) => apiClient.checkAnalysisStatus(id, jobId)
};