'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDiary, useDiaryActions } from '../../usecases/diary/useDiary';
import { useDiaryList } from '../../usecases/diary/useDiaryList';
import { isDiaryModified } from '../../models/diary/selector';
import { Editor } from '../ui/Editor';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Sidebar } from '../ui/Sidebar';
import { EmotionIcon } from '../model/emotion/EmotionIcon';
import { EmotionBreakdown } from '../model/emotion/EmotionBreakdown';

interface DiaryEditPageProps {
  id?: string; // undefinedの場合は新規作成
}

export function DiaryEditPage({ id }: DiaryEditPageProps) {
  const router = useRouter();
  const { diary, isLoading: isDiaryLoading } = useDiary(id);
  const { diaries } = useDiaryList();
  const { createDiary, updateDiary, analyzeDiary, isCreating, isUpdating, isAnalyzing } = useDiaryActions();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const isNewDiary = !id;
  const isModified = diary ? isDiaryModified(diary, { title, content }) : (title.trim() !== '' || content.trim() !== '');
  const isSaving = isCreating || isUpdating;

  // 日記データの初期化
  useEffect(() => {
    if (diary) {
      setTitle(diary.title);
      setContent(diary.content);
    }
  }, [diary]);

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isModified]);

  const handleSave = async () => {
    try {
      if (isNewDiary) {
        const newDiary = await createDiary({ title, content });
        router.push(`/diary/${newDiary.id}`);
      } else if (diary) {
        await updateDiary(diary.id, { title, content });
      }
    } catch (error) {
      console.error('保存に失敗しました:', error);
      // TODO: エラートースト表示
    }
  };

  const handleAnalyze = async () => {
    if (!diary) return;

    try {
      await analyzeDiary(diary.id);
    } catch (error) {
      console.error('感情分析に失敗しました:', error);
      // TODO: エラートースト表示
    }
  };

  const handleDiscardChanges = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

  if (isDiaryLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar diaries={diaries} />
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (id && !diary) {
    return (
      <div className="flex h-screen">
        <Sidebar diaries={diaries} />
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">日記が見つかりません</h2>
            <Button onClick={() => router.push('/')}>ホームに戻る</Button>
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
        {/* エディタエリア */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto px-24 py-12">
            {/* アイコンと感情分析表示 */}
            {diary?.iconData && diary?.emotionAnalysis && (
              <div className="mb-6 flex items-start gap-6">
                <EmotionIcon icon={diary.iconData} size={78} />
                <EmotionBreakdown emotionAnalysis={diary.emotionAnalysis} />
              </div>
            )}

            {/* タイトル入力と保存ボタン */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="無題"
                className="flex-1 text-4xl font-bold border-none outline-none placeholder-gray-300"
              />
              <div className="flex items-center gap-3 flex-shrink-0">
                {isModified && (
                  <span className="text-xs text-orange-600 font-medium whitespace-nowrap">未保存</span>
                )}
                {!isNewDiary && diary && (
                  <Button
                    variant="secondary"
                    onClick={handleAnalyze}
                    isLoading={isAnalyzing}
                    disabled={!content.trim()}
                  >
                    感情分析
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={!title.trim() && !content.trim()}
                >
                  保存
                </Button>
              </div>
            </div>

            {/* 日付表示 */}
            {diary && (
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-8">
                <span>
                  作成: {diary.createdAt.toLocaleDateString('ja-JP')}
                </span>
                <span>•</span>
                <span>
                  更新: {diary.updatedAt.toLocaleDateString('ja-JP')}
                </span>
                {diary.emotionAnalysis && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">感情分析済み</span>
                  </>
                )}
              </div>
            )}

            {/* エディタ */}
            <Editor
              initialContent={content}
              onChange={setContent}
              placeholder="今日はどんな一日でしたか？"
            />
          </div>
        </main>
      </div>

      {/* 未保存変更の確認モーダル */}
      <Modal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="未保存の変更があります"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            変更が保存されていません。このまま離れますか？
          </p>
          
          <div className="flex space-x-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowUnsavedModal(false)}
            >
              キャンセル
            </Button>
            
            <Button
              onClick={handleSave}
              isLoading={isSaving}
            >
              保存して移動
            </Button>
            
            <Button
              variant="danger"
              onClick={handleDiscardChanges}
            >
              破棄して移動
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}