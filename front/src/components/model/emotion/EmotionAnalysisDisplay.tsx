import type { EmotionAnalysis } from '../../../types/emotion';
import { getSortedEmotions } from '../../../models/diary/selector';
import { EMOTION_COLORS } from '../../../types/emotion';

interface EmotionAnalysisDisplayProps {
  analysis: EmotionAnalysis;
  className?: string;
}

export function EmotionAnalysisDisplay({ analysis, className = '' }: EmotionAnalysisDisplayProps) {
  const sortedEmotions = getSortedEmotions(analysis);

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">感情分析結果</h3>
      
      <div className="space-y-2">
        {sortedEmotions.map(({ emotion, value, label, percentage }) => (
          <div key={emotion} className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-xs text-gray-500">{percentage}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${value * 100}%`,
                    background: `linear-gradient(90deg, ${EMOTION_COLORS[emotion].startColor}, ${EMOTION_COLORS[emotion].endColor})`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 mt-3">
        分析日時: {analysis.analyzedAt.toLocaleString('ja-JP')}
      </div>
    </div>
  );
}