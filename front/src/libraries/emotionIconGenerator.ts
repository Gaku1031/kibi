import type { EmotionAnalysis, EmotionIcon, Triangle, EmotionType } from '../types/emotion';
import { EMOTION_COLORS } from '../types/emotion';

// シンプルな疑似乱数生成器（再現性のため）
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
  emotionAnalysis: EmotionAnalysis,
  seed?: number
): EmotionIcon {
  const iconSeed = seed ?? Math.floor(Math.random() * 1000000);
  const random = new SeededRandom(iconSeed);
  
  const triangles: Triangle[] = [];

  // analyzedAtを除外して感情データのみ抽出
  const { analyzedAt, ...emotionScores } = emotionAnalysis;
  const emotions = Object.entries(emotionScores) as [EmotionType, number][];

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

export function renderEmotionIconToSVG(
  icon: EmotionIcon,
  width: number = 100,
  height: number = 100
): string {
  const uniqueId = `icon-${icon.seed}`;

  const gradientDefs = icon.triangles
    .filter(triangle => triangle.gradient) // gradientが存在する三角形のみ
    .map((triangle, index) => {
      const gradientId = `${uniqueId}-gradient-${index}`;
      return `
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${triangle.gradient.startColor};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${triangle.gradient.endColor};stop-opacity:0.9" />
        </linearGradient>
      `;
    }).join('');

  const triangleElements = icon.triangles
    .filter(triangle => triangle.gradient) // gradientが存在する三角形のみ
    .map((triangle, index) => {
      const size = triangle.size * 30; // 基本サイズ
      const centerX = (triangle.x / 100) * width;
      const centerY = (triangle.y / 100) * height;

      // 正三角形の頂点を計算
      const points = [
        [centerX, centerY - size * 0.577], // 上の頂点
        [centerX - size * 0.5, centerY + size * 0.289], // 左下の頂点
        [centerX + size * 0.5, centerY + size * 0.289]  // 右下の頂点
      ];

      const gradientId = `${uniqueId}-gradient-${index}`;

      return `
        <polygon
          points="${points.map(p => p.join(',')).join(' ')}"
          fill="url(#${gradientId})"
          transform="rotate(${triangle.rotation} ${centerX} ${centerY})"
          stroke="rgba(255,255,255,0.3)"
          stroke-width="1"
        />
      `;
    }).join('');
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${gradientDefs}
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.05)" rx="8"/>
      ${triangleElements}
    </svg>
  `;
}