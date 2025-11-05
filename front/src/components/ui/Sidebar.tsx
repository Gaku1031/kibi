'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from './Tooltip';

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

  return (
    <aside className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors">
          <div className="text-2xl">📔</div>
          <h1 className="text-lg font-semibold text-gray-900">kibi</h1>
        </Link>
      </div>

      {/* View Navigation */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Tooltip content="一覧">
            <Link
              href="/list"
              className={`inline-flex p-2 rounded-lg transition-colors ${
                pathname === '/list'
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
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
              className={`inline-flex p-2 rounded-lg transition-colors ${
                pathname === '/timeline'
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
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
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <Link
            href="/"
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新しい日記</span>
          </Link>
        </div>

        {/* Diary List */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
            日記一覧
          </div>
          {diaries.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              日記がありません
            </div>
          ) : (
            diaries.map((diary) => {
              const isActive = pathname === `/diary/${diary.id}`;
              return (
                <Link
                  key={diary.id}
                  href={`/diary/${diary.id}`}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-base">
                    {diary.iconData ? '🎨' : '📄'}
                  </div>
                  <span className="flex-1 truncate">
                    {diary.title || '無題の日記'}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          感情の機微を発見する
        </div>
      </div>
    </aside>
  );
}
