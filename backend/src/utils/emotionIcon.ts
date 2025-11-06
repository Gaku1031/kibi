import type { EmotionAnalysis, EmotionIcon, Triangle, EmotionType } from '../types/index.js';

const EMOTION_COLORS: Record<EmotionType, { startColor: string; endColor: string }> = {
  joy: { startColor: '#FFD700', endColor: '#FFA500' },
  trust: { startColor: '#87CEEB', endColor: '#4682B4' },
  fear: { startColor: '#800080', endColor: '#4B0082' },
  surprise: { startColor: '#FFFF00', endColor: '#FFD700' },
  sadness: { startColor: '#4169E1', endColor: '#191970' },
  disgust: { startColor: '#9ACD32', endColor: '#556B2F' },
  anger: { startColor: '#FF4500', endColor: '#8B0000' },
  anticipation: { startColor: '#FF69B4', endColor: '#C71585' }
};

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export function generateEmotionIcon(
  emotionAnalysis: Omit<EmotionAnalysis, 'diaryId' | 'analyzedAt'>,
  seed?: number
): EmotionIcon {
  const iconSeed = seed ?? Math.floor(Math.random() * 1000000);
  const random = new SeededRandom(iconSeed);
  
  const triangles: Triangle[] = [];
  const emotions = Object.entries(emotionAnalysis) as [EmotionType, number][];
  
  // 感情値が0.1以上の感情のみ処理
  const significantEmotions = emotions.filter(([, value]) => value >= 0.1);
  
  // 三角形の重複を避けるための配置管理
  const usedPositions: { x: number; y: number; size: number }[] = [];
  
  for (const [emotion, value] of significantEmotions) {
    const size = Math.max(0.2, Math.min(1.0, value * 0.8 + 0.2));
    
    // 重複しない位置を見つける
    let position = findNonOverlappingPosition(random, size, usedPositions);
    let attempts = 0;
    while (!position && attempts < 50) {
      position = findNonOverlappingPosition(random, size, usedPositions);
      attempts++;
    }
    
    // 50回試行しても見つからない場合はランダム配置
    if (!position) {
      position = {
        x: random.next() * 80 + 10, // 10-90%の範囲
        y: random.next() * 80 + 10
      };
    }
    
    usedPositions.push({ ...position, size });
    
    const triangle: Triangle = {
      emotion,
      size,
      x: position.x,
      y: position.y,
      rotation: random.next() * 360,
      gradient: EMOTION_COLORS[emotion]
    };
    
    triangles.push(triangle);
  }
  
  return {
    triangles,
    seed: iconSeed
  };
}

function findNonOverlappingPosition(
  random: SeededRandom,
  size: number,
  usedPositions: { x: number; y: number; size: number }[]
): { x: number; y: number } | null {
  const x = random.next() * 80 + 10; // 10-90%の範囲
  const y = random.next() * 80 + 10;
  
  // 他の三角形との重複チェック
  const minDistance = (size + 0.3) * 30; // サイズに応じた最小距離
  
  for (const pos of usedPositions) {
    const distance = Math.sqrt(
      Math.pow((x - pos.x) * 5, 2) + Math.pow((y - pos.y) * 5, 2)
    );
    
    if (distance < minDistance) {
      return null; // 重複している
    }
  }
  
  return { x, y };
}