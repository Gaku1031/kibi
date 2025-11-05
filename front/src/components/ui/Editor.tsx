'use client';

import dynamic from 'next/dynamic';

// BlockNoteエディタを使用（SSRを無効化）
const BlockNoteEditor = dynamic(
  () => import('./BlockNoteEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    )
  }
);

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function Editor(props: EditorProps) {
  return <BlockNoteEditor {...props} />;
}