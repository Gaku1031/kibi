import type { EmotionAnalysis, EmotionType } from '../../../types/emotion';
import { EMOTION_COLORS, EMOTION_LABELS } from '../../../types/emotion';

interface EmotionBreakdownProps {
  emotionAnalysis: EmotionAnalysis;
  className?: string;
}

export function EmotionBreakdown({ emotionAnalysis, className = '' }: EmotionBreakdownProps) {
  // 感情の配列を取得し、値でソート
  const emotions = Object.entries(emotionAnalysis)
    .filter(([key]) => key !== 'analyzedAt')
    .map(([emotion, value]) => ({
      emotion: emotion as EmotionType,
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className={`space-y-2 ${className}`}>
      {emotions.map(({ emotion, value }) => {
        const percentage = Math.round(value * 100);
        const color = EMOTION_COLORS[emotion].startColor;

        return (
          <div key={emotion} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-700 min-w-[4rem]">
              {EMOTION_LABELS[emotion]}
            </span>
            <span className="text-gray-500 font-medium">
              {percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
