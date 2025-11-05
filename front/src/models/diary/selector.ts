import type { DiaryEntry } from '../../types/diary';
import type { EmotionAnalysis, EmotionType } from '../../types/emotion';
import { EMOTION_LABELS } from '../../types/emotion';

// 日記の表示用タイトルを取得
export function getDisplayTitle(diary: DiaryEntry): string {
  if (diary.title.trim()) {
    return diary.title;
  }
  
  // タイトルが空の場合、作成日から生成
  const date = diary.createdAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return `${date}の日記`;
}

// 日記の概要テキストを取得（BlockNoteのJSONから）
export function getContentSummary(diary: DiaryEntry, maxLength: number = 100): string {
  try {
    const content = JSON.parse(diary.content);
    let text = '';
    
    // BlockNoteのブロック構造から文字列を抽出
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.type === 'text' && item.text) {
              text += item.text + ' ';
            }
          }
        }
      }
    }
    
    text = text.trim();
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text || '内容なし';
  } catch {
    return '内容を読み込めませんでした';
  }
}

// 感情分析結果から主要な感情を取得
export function getPrimaryEmotion(analysis: EmotionAnalysis): {
  emotion: EmotionType;
  value: number;
  label: string;
} | null {
  const emotions = Object.entries(analysis) as [EmotionType, number][];
  const validEmotions = emotions.filter(([key]) => key !== 'analyzedAt');
  
  if (validEmotions.length === 0) return null;
  
  const [emotion, value] = validEmotions.reduce((max, current) => 
    current[1] > max[1] ? current : max
  );
  
  return {
    emotion,
    value,
    label: EMOTION_LABELS[emotion]
  };
}

// 感情分析結果を表示用にソート
export function getSortedEmotions(analysis: EmotionAnalysis): Array<{
  emotion: EmotionType;
  value: number;
  label: string;
  percentage: string;
}> {
  const emotions = Object.entries(analysis) as [EmotionType, number][];
  const validEmotions = emotions.filter(([key]) => key !== 'analyzedAt');
  
  return validEmotions
    .map(([emotion, value]) => ({
      emotion,
      value,
      label: EMOTION_LABELS[emotion],
      percentage: `${Math.round(value * 100)}%`
    }))
    .sort((a, b) => b.value - a.value);
}

// 日記が編集中かどうかを判定
export function isDiaryModified(
  original: DiaryEntry,
  current: { title: string; content: string }
): boolean {
  return original.title !== current.title || original.content !== current.content;
}

// 日記の文字数を取得
export function getContentLength(content: string): number {
  try {
    const parsed = JSON.parse(content);
    let length = 0;
    
    if (Array.isArray(parsed)) {
      for (const block of parsed) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.type === 'text' && item.text) {
              length += item.text.length;
            }
          }
        }
      }
    }
    
    return length;
  } catch {
    return 0;
  }
}