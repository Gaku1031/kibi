export type EmotionType = 
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation';

export interface EmotionAnalysis {
  joy: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
  analyzedAt: Date;
}

export interface Triangle {
  emotion: EmotionType;
  size: number; // 0.1-1.0
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  rotation: number; // 0-360 (度)
  gradient: {
    startColor: string;
    endColor: string;
  };
}

export interface EmotionIcon {
  triangles: Triangle[];
  seed: number; // 再現性のための乱数シード
}

export const EMOTION_COLORS: Record<EmotionType, { startColor: string; endColor: string }> = {
  joy: { startColor: '#FFD700', endColor: '#FFA500' },
  trust: { startColor: '#87CEEB', endColor: '#4682B4' },
  fear: { startColor: '#800080', endColor: '#4B0082' },
  surprise: { startColor: '#FFFF00', endColor: '#FFD700' },
  sadness: { startColor: '#4169E1', endColor: '#191970' },
  disgust: { startColor: '#9ACD32', endColor: '#556B2F' },
  anger: { startColor: '#FF4500', endColor: '#8B0000' },
  anticipation: { startColor: '#FF69B4', endColor: '#C71585' }
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '喜び',
  trust: '信頼',
  fear: '恐怖',
  surprise: '驚き',
  sadness: '悲しみ',
  disgust: '嫌悪',
  anger: '怒り',
  anticipation: '期待'
};