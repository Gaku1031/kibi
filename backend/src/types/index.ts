export interface DiaryEntry {
  id: string;
  userId: string; // 将来の認証対応用
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmotionAnalysis {
  diaryId: string;
  joy: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
  analyzedAt: string;
}

export interface EmotionIcon {
  triangles: Triangle[];
  seed: number;
}

export interface Triangle {
  emotion: EmotionType;
  size: number;
  x: number;
  y: number;
  rotation: number;
  gradient: {
    startColor: string;
    endColor: string;
  };
}

export type EmotionType = 
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation';

export interface CreateDiaryRequest {
  title: string;
  content: string;
}

export interface UpdateDiaryRequest {
  title?: string;
  content?: string;
}