import Link from 'next/link';
import type { DiaryEntry } from '../../../types/diary';
import { EmotionIcon } from '../emotion/EmotionIcon';
import { getDisplayTitle } from '../../../models/diary/selector';

interface DiaryCardProps {
  diary: DiaryEntry;
  className?: string;
}

export function DiaryCard({ diary, className = '' }: DiaryCardProps) {
  const title = getDisplayTitle(diary);
  const formattedDate = diary.createdAt.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric'
  });

  const formattedTime = diary.createdAt.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Link href={`/diary/${diary.id}`}>
      <div className={`
        bg-gradient-to-br from-white via-gray-50 to-blue-50/30
        hover:shadow-lg transition-all duration-300 cursor-pointer
        flex flex-col items-center p-6 rounded-2xl
        shadow-md border-2 border-gray-100/50
        transform
        ${className}
      `}>
        {/* 日付と時刻 */}
        <div className="text-center mb-4 px-3 py-1.5 rounded-full">
          <div className="text-base font-bold text-gray-800">
            {formattedDate}
          </div>
          <div className="text-xs font-medium mt-0.5">
            {formattedTime}
          </div>
        </div>

        {/* 感情アイコン */}
        <div className="flex items-center justify-center w-full mb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/20 to-blue-100/20 rounded-full blur-xl"></div>
          {diary.iconData ? (
            <div className="relative">
              <EmotionIcon icon={diary.iconData} size={100} />
            </div>
          ) : (
            <div className="relative w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center shadow-inner">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* タイトル */}
        <div className="text-sm text-gray-800 text-center line-clamp-2 w-full px-2 font-semibold">
          {title}
        </div>
      </div>
    </Link>
  );
}
