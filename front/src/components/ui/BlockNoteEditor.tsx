'use client';

import { useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { PartialBlock } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

interface BlockNoteEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function BlockNoteEditorComponent({
  initialContent = '',
  onChange,
  placeholder = '今日はどんな一日でしたか？',
  editable = true
}: BlockNoteEditorProps) {
  // 初期コンテンツをBlockNote形式にパース
  const parsedInitialContent = useMemo(() => {
    if (!initialContent) return undefined;
    console.log('[BlockNote] Parsing initial content, length:', initialContent.length);
    return parseContent(initialContent);
  }, [initialContent]);

  // BlockNoteエディタを作成
  const editor = useCreateBlockNote({
    initialContent: parsedInitialContent,
  });

  // initialContentが変わったらエディタの内容を更新
  useEffect(() => {
    if (!editor || !initialContent) return;

    const parsed = parseContent(initialContent);
    if (parsed && JSON.stringify(editor.document) !== JSON.stringify(parsed)) {
      console.log('[BlockNote] Updating editor content from initialContent change');
      editor.replaceBlocks(editor.document, parsed);
    }
  }, [editor, initialContent]);

  // コンテンツの変更を監視
  useEffect(() => {
    if (!onChange || !editor) return;

    // エディタの変更を監視
    const unsubscribe = editor.onChange(() => {
      const blocks = editor.document;
      const serialized = JSON.stringify(blocks);
      console.log('[BlockNote] Content changed:', serialized);
      onChange(serialized);
    });

    return unsubscribe;
  }, [editor, onChange]);

  // プレースホルダーの設定
  useEffect(() => {
    if (!editor) return;
    editor.domElement?.setAttribute('data-placeholder', placeholder);
  }, [editor, placeholder]);

  if (!editor) {
    return (
      <div className="min-h-[400px] p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    );
  }

  return (
    <div className="blocknote-editor-wrapper">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
      />
    </div>
  );
}

function parseContent(content: string): PartialBlock[] | undefined {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    // JSONパースに失敗した場合は、プレーンテキストとして扱う
    return [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: content, styles: {} }]
      }
    ];
  }
}