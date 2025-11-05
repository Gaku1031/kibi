import type { DiaryEntry, CreateDiaryRequest, UpdateDiaryRequest } from '../../types/diary';
import { mockApi } from '../../libraries/mockApi';

export interface DiaryRepository {
  getDiaries(): Promise<DiaryEntry[]>;
  getDiary(id: string): Promise<DiaryEntry | null>;
  createDiary(data: CreateDiaryRequest): Promise<DiaryEntry>;
  updateDiary(id: string, data: UpdateDiaryRequest): Promise<DiaryEntry | null>;
  deleteDiary(id: string): Promise<boolean>;
  analyzeDiary(id: string): Promise<DiaryEntry | null>;
}

export const diaryRepository: DiaryRepository = {
  getDiaries: () => mockApi.getDiaries(),
  getDiary: (id: string) => mockApi.getDiary(id),
  createDiary: (data: CreateDiaryRequest) => mockApi.createDiary(data),
  updateDiary: (id: string, data: UpdateDiaryRequest) => mockApi.updateDiary(id, data),
  deleteDiary: (id: string) => mockApi.deleteDiary(id),
  analyzeDiary: (id: string) => mockApi.analyzeDiary(id)
};