'use client';

import { useState, useEffect } from 'react';

interface SimpleEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function SimpleEditor({ 
  initialContent = '', 
  onChange, 
  placeholder = '今日はどんな一日でしたか？',
  editable = true 
}: SimpleEditorProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    // BlockNoteのJSON形式から文字列を抽出
    if (initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed)) {
          let text = '';
          for (const block of parsed) {
            if (block.content && Array.isArray(block.content)) {
              for (const item of block.content) {
                if (item.type === 'text' && item.text) {
                  text += item.text;
                }
              }
            }
            if (text && !text.endsWith('\n')) {
              text += '\n';
            }
          }
          setContent(text.trim());
        } else {
          setContent(initialContent);
        }
      } catch {
        setContent(initialContent);
      }
    }
  }, [initialContent]);

  const handleChange = (value: string) => {
    setContent(value);
    if (onChange) {
      // 改行で分割してBlockNote形式のJSONに変換
      const lines = value.split('\n');
      const blockNoteContent = lines.map(line => ({
        type: 'paragraph',
        content: line.trim() ? [{ type: 'text', text: line }] : []
      }));
      onChange(JSON.stringify(blockNoteContent));
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden min-h-[400px] bg-white">
      <div className="p-4">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={!editable}
          className="w-full border-none outline-none resize-none font-sans text-gray-900 placeholder-gray-500 leading-relaxed"
          style={{ 
            minHeight: '360px',
            fontSize: '16px',
            lineHeight: '1.6'
          }}
        />
      </div>
      
      {/* エディタフッター */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
        <span>文字数: {content.length}</span>
        <span>Shift + Enter で改行</span>
      </div>
    </div>
  );
}