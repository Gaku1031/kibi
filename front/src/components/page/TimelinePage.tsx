'use client';

import Link from 'next/link';
import { useDiaryList } from '../../usecases/diary/useDiaryList';
import { EmotionIcon } from '../model/emotion/EmotionIcon';
import { getDisplayTitle } from '../../models/diary/selector';
import { Sidebar } from '../ui/Sidebar';
import { Button } from '../ui/Button';

export function TimelinePage() {
  const { diaries, isLoading, error } = useDiaryList();

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar diaries={diaries} />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
            <p className="text-gray-600 mb-4">日記の読み込みに失敗しました</p>
            <Link href="/">
              <Button>ホームに戻る</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const diariesWithIcons = diaries.filter(diary => diary.iconData);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* サイドバー */}
      <Sidebar diaries={diaries} />

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 時系列エリア */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
          <div className="max-w-4xl mx-auto px-24 py-12">
            {/* タイトル */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>時系列表示</h1>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : diariesWithIcons.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">感情分析済みの日記がありません</h3>
                <p className="text-gray-500 mb-4">日記を書いて感情分析を実行すると、ここに時系列で表示されます</p>
                <Link href="/">
                  <Button>日記を書く</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 時系列表示 */}
                <div className="relative">
                  {/* タイムライン */}
                  <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-200 via-blue-200 to-purple-200 rounded-full" />

                  <div className="space-y-8">
                    {diariesWithIcons.map((diary) => (
                      <div key={diary.id} className="relative flex items-center space-x-6">
                        {/* タイムラインドット */}
                        <div className="relative z-10 flex-shrink-0">
                          <Link href={`/diary/${diary.id}`}>
                            <div className="cursor-pointer hover:scale-125 transition-all duration-300 relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-lg"></div>
                              <EmotionIcon icon={diary.iconData!} size={64} />
                            </div>
                          </Link>
                        </div>

                        {/* 日記情報 */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/diary/${diary.id}`}>
                            <div className="cursor-pointer hover:shadow-lg p-4 rounded-xl transition-all duration-300 bg-gradient-to-br from-white via-gray-50 to-blue-50/20 border border-gray-100/50 hover:-translate-y-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {getDisplayTitle(diary)}
                              </h3>

                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <time dateTime={diary.createdAt.toISOString()} className="font-medium">
                                  {diary.createdAt.toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short'
                                  })}
                                </time>

                                {diary.emotionAnalysis && (
                                  <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium">
                                    分析済み: {diary.emotionAnalysis.analyzedAt.toLocaleTimeString('ja-JP', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 統計情報 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {diaries.length}
                    </div>
                    <div className="text-sm text-gray-600">総日記数</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {diariesWithIcons.length}
                    </div>
                    <div className="text-sm text-gray-600">分析済み</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-2">
                      {Math.round((diariesWithIcons.length / Math.max(diaries.length, 1)) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">分析率</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
