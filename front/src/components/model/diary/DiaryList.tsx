import type { DiaryEntry } from '../../../types/diary';
import { DiaryCard } from './DiaryCard';

interface DiaryListProps {
  diaries: DiaryEntry[];
  isLoading?: boolean;
  className?: string;
}

// 週の開始日（月曜日）を取得
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始にする
  const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
  weekStart.setHours(0, 0, 0, 0); // 時刻をリセット
  return weekStart;
}

// 週のラベルを生成
function getWeekLabel(startDate: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const diffTime = today.getTime() - weekStart.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

  if (diffWeeks === 0) return '今週';
  if (diffWeeks === 1) return '先週';
  if (diffWeeks < 4) return `${diffWeeks}週間前`;

  const diffMonths = Math.floor(diffWeeks / 4);
  if (diffMonths < 12) return `${diffMonths}ヶ月前`;

  return `${Math.floor(diffMonths / 12)}年前`;
}

// 日記を週ごとにグループ化
function groupByWeek(diaries: DiaryEntry[]): Array<{ weekStart: Date; label: string; diaries: DiaryEntry[] }> {
  const groups = new Map<string, DiaryEntry[]>();

  diaries.forEach((diary) => {
    const weekStart = getWeekStart(diary.createdAt);
    const key = weekStart.toISOString();

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(diary);
  });

  // 週の開始日でソート（新しい順）
  const sortedGroups = Array.from(groups.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([key, diaries]) => {
      const weekStart = new Date(key);
      return {
        weekStart,
        label: getWeekLabel(weekStart),
        diaries: diaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      };
    });

  return sortedGroups;
}

export function DiaryList({ diaries, isLoading = false, className = '' }: DiaryListProps) {
  if (isLoading) {
    return (
      <div className={`space-y-8 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i}>
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-5 gap-6">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="bg-white rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-3"></div>
                  <div className="w-24 h-24 bg-gray-200 rounded-lg mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (diaries.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">まだ日記がありません</h3>
        <p className="text-gray-500">最初の日記を書いてみましょう</p>
      </div>
    );
  }

  const weekGroups = groupByWeek(diaries);

  return (
    <div className={`space-y-12 ${className}`}>
      {weekGroups.map((group) => (
        <div key={group.weekStart.toISOString()}>
          {/* 週のラベル */}
          <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--foreground)' }}>
            {group.label}
          </h2>

          {/* グリッド表示 */}
          <div className="grid grid-cols-5 gap-6">
            {group.diaries.map((diary) => (
              <DiaryCard key={diary.id} diary={diary} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}