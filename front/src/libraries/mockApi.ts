import { v4 as uuidv4 } from 'uuid';
import type { DiaryEntry, CreateDiaryRequest, UpdateDiaryRequest } from '../types/diary';
import type { EmotionAnalysis } from '../types/emotion';
import { generateEmotionIcon } from './emotionIconGenerator';

// ローカルストレージキー
const STORAGE_KEY = 'kibi_diary_entries';

// モックデータの初期化
function initializeMockData(): DiaryEntry[] {
  if (typeof window === 'undefined') return []; // サーバーサイドでは空配列を返す
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const entries = JSON.parse(stored);
    // Date型の復元
    return entries.map((entry: any) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt),
      emotionAnalysis: entry.emotionAnalysis ? {
        ...entry.emotionAnalysis,
        analyzedAt: new Date(entry.emotionAnalysis.analyzedAt)
      } : undefined
    }));
  }
  return [];
}

function saveMockData(entries: DiaryEntry[]): void {
  if (typeof window === 'undefined') return; // サーバーサイドでは何もしない
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// 感情分析のモック（ランダム値生成）
function generateMockEmotionAnalysis(): EmotionAnalysis {
  return {
    joy: Math.random() * 0.8 + 0.1,
    trust: Math.random() * 0.7 + 0.1,
    fear: Math.random() * 0.6 + 0.05,
    surprise: Math.random() * 0.5 + 0.05,
    sadness: Math.random() * 0.6 + 0.05,
    disgust: Math.random() * 0.4 + 0.05,
    anger: Math.random() * 0.5 + 0.05,
    anticipation: Math.random() * 0.7 + 0.1,
    analyzedAt: new Date()
  };
}

// API遅延のシミュレーション
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const mockApi = {
  // 日記一覧取得
  async getDiaries(): Promise<DiaryEntry[]> {
    await delay(300);
    const entries = initializeMockData();
    return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // 日記詳細取得
  async getDiary(id: string): Promise<DiaryEntry | null> {
    await delay(200);
    const entries = initializeMockData();
    return entries.find(entry => entry.id === id) || null;
  },

  // 日記作成
  async createDiary(data: CreateDiaryRequest): Promise<DiaryEntry> {
    await delay(500);
    const entries = initializeMockData();
    
    const newEntry: DiaryEntry = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    entries.push(newEntry);
    saveMockData(entries);
    
    return newEntry;
  },

  // 日記更新
  async updateDiary(id: string, data: UpdateDiaryRequest): Promise<DiaryEntry | null> {
    await delay(400);
    const entries = initializeMockData();
    const index = entries.findIndex(entry => entry.id === id);
    
    if (index === -1) return null;
    
    entries[index] = {
      ...entries[index],
      ...data,
      updatedAt: new Date()
    };
    
    saveMockData(entries);
    return entries[index];
  },

  // 日記削除
  async deleteDiary(id: string): Promise<boolean> {
    await delay(300);
    const entries = initializeMockData();
    const filteredEntries = entries.filter(entry => entry.id !== id);
    
    if (filteredEntries.length === entries.length) return false;
    
    saveMockData(filteredEntries);
    return true;
  },

  // 感情分析実行
  async analyzeDiary(id: string): Promise<DiaryEntry | null> {
    await delay(2000); // 感情分析は時間がかかることをシミュレート
    const entries = initializeMockData();
    const index = entries.findIndex(entry => entry.id === id);
    
    if (index === -1) return null;
    
    const emotionAnalysis = generateMockEmotionAnalysis();
    const iconData = generateEmotionIcon(emotionAnalysis);
    
    entries[index] = {
      ...entries[index],
      emotionAnalysis,
      iconData,
      updatedAt: new Date()
    };
    
    saveMockData(entries);
    return entries[index];
  }
};