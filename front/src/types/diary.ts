import type { EmotionAnalysis, EmotionIcon } from './emotion';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string; // BlockNoteのJSON形式
  createdAt: Date;
  updatedAt: Date;
  emotionAnalysis?: EmotionAnalysis;
  iconData?: EmotionIcon;
}

export interface CreateDiaryRequest {
  title: string;
  content: string;
}

export interface UpdateDiaryRequest {
  title?: string;
  content?: string;
}