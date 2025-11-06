'use client';

import { useDiaryList } from '../../usecases/diary/useDiaryList';
import { DiaryList } from '../model/diary/DiaryList';
import { Sidebar } from '../ui/Sidebar';
import { Button } from '../ui/Button';

export function DiaryListPage() {
  const { diaries, isLoading, error, refresh } = useDiaryList();

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar diaries={diaries} />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
            <p className="text-gray-600 mb-4">日記の読み込みに失敗しました</p>
            <Button onClick={refresh}>再試行</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* サイドバー */}
      <Sidebar diaries={diaries} />

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 一覧エリア */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
          <div className="max-w-6xl mx-auto px-12 py-12">
            {/* タイトル */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>一覧</h1>
            </div>

            {/* 日記一覧 */}
            <DiaryList
              diaries={diaries}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
