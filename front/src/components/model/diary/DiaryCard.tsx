import Link from 'next/link';
import type { DiaryEntry } from '../../../types/diary';
import { getDisplayTitle, getContentSummary, getPrimaryEmotion } from '../../../models/diary/selector';
import { EmotionIcon } from '../emotion/EmotionIcon';

interface DiaryCardProps {
  diary: DiaryEntry;
  className?: string;
}

export function DiaryCard({ diary, className = '' }: DiaryCardProps) {
  const title = getDisplayTitle(diary);
  const summary = getContentSummary(diary, 120);
  const primaryEmotion = diary.emotionAnalysis ? getPrimaryEmotion(diary.emotionAnalysis) : null;

  return (
    <Link href={`/diary/${diary.id}`}>
      <div className={`
        bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer
        ${className}
      `}>
        <div className="flex items-start space-x-4">
          {/* 感情アイコン */}
          <div className="flex-shrink-0">
            {diary.iconData ? (
              <EmotionIcon icon={diary.iconData} size={48} />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
              {title}
            </h3>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-3">
              {summary}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <time dateTime={diary.createdAt.toISOString()}>
                {diary.createdAt.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>

              {primaryEmotion && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {primaryEmotion.label} {Math.round(primaryEmotion.value * 100)}%
                </span>
              )}
            </div>

            {diary.emotionAnalysis && (
              <div className="mt-2 text-xs text-green-600">
                ✓ 感情分析済み
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}