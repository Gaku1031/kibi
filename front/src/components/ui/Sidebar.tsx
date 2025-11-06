'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Tooltip } from './Tooltip';
import { Modal } from './Modal';
import { Button } from './Button';
import { useDiaryActions } from '../../usecases/diary/useDiary';

interface SidebarProps {
  diaries?: Array<{
    id: string;
    title: string;
    createdAt: Date;
    iconData?: any;
  }>;
}

export function Sidebar({ diaries = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { deleteDiary, isDeleting } = useDiaryActions();
  const [hoveredDiaryId, setHoveredDiaryId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const success = await deleteDiary(deleteTargetId);
      if (success) {
        // 現在表示している日記が削除された場合はリストページへ
        if (pathname === `/diary/${deleteTargetId}`) {
          router.push('/list');
        }
      }
    } catch (error) {
      console.error('削除に失敗しました:', error);
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="日記を削除しますか？"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            この操作は取り消せません。本当に削除してもよろしいですか？
          </p>

          <div className="flex space-x-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteTargetId(null)}
            >
              キャンセル
            </Button>

            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              削除する
            </Button>
          </div>
        </div>
      </Modal>


    <aside className="w-64 h-screen sidebar-bg border-r flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <Image src="/icon.png" alt="kibi" width={36} height={36} className="rounded-lg" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-playfair)' }}>kibi</h1>
        </Link>
      </div>

      {/* View Navigation */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <Tooltip content="一覧">
            <Link
              href="/list"
              className={`inline-flex p-2.5 rounded-xl transition-all ${
                pathname === '/list'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
              }`}
            >
              {/* 9つの丸が並んだグリッドアイコン */}
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="5" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="12" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
              </svg>
            </Link>
          </Tooltip>

          <Tooltip content="時系列表示">
            <Link
              href="/timeline"
              className={`inline-flex p-2.5 rounded-xl transition-all ${
                pathname === '/timeline'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
              }`}
            >
              {/* 折れ線グラフアイコン */}
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="3,18 7,12 11,15 15,9 19,13 21,11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </Tooltip>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新しい日記</span>
          </Link>
        </div>

        {/* Diary List */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
            日記一覧
          </div>
          {diaries.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              日記がありません
            </div>
          ) : (
            diaries.map((diary) => {
              const isActive = pathname === `/diary/${diary.id}`;
              const isHovered = hoveredDiaryId === diary.id;
              return (
                <div
                  key={diary.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredDiaryId(diary.id)}
                  onMouseLeave={() => setHoveredDiaryId(null)}
                >
                  <Link
                    href={`/diary/${diary.id}`}
                    className={`flex items-center space-x-2 px-3 py-2.5 text-sm rounded-xl transition-all ${
                      isActive
                        ? 'bg-white shadow-sm text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="text-lg">
                      {diary.iconData ? '🎨' : '📄'}
                    </div>
                    <span className="flex-1 truncate">
                      {diary.title || '無題の日記'}
                    </span>
                  </Link>
                  {isHovered && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTargetId(diary.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-100 transition-colors"
                      aria-label="削除"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </nav>
    </aside>
    </>
  );
}
