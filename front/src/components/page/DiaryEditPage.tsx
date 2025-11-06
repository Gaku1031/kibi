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
  const { createDiary, updateDiary, startAsyncAnalysis, pollAnalysisStatus, isCreating, isUpdating, isAnalyzing, analysisProgress } = useDiaryActions();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const isNewDiary = !id;
  const isModified = diary ? isDiaryModified(diary, { title, content }) : (title.trim() !== '' || content.trim() !== '');
  const isSaving = isCreating || isUpdating || isAnalyzing;
  const [isContentInitialized, setIsContentInitialized] = useState(false);

  // 日記データの初期化
  useEffect(() => {
    if (diary && !isContentInitialized) {
      setTitle(diary.title);
      setContent(diary.content);
      setIsContentInitialized(true);
    }
  }, [diary, isContentInitialized]);

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
      let diaryId: string;

      if (isNewDiary) {
        const newDiary = await createDiary({ title, content });
        diaryId = newDiary.id;

        // 新規作成の場合は、保存後に感情分析を実行してから遷移
        if (content.trim()) {
          try {
            const jobId = await startAsyncAnalysis(diaryId);
            if (jobId) {
              // ポーリングして分析完了を待つ
              await pollAnalysisStatus(diaryId, jobId);
            }
          } catch (error) {
            console.error('感情分析に失敗しました:', error);
            // 分析失敗してもページ遷移は続行
          }
        }

        router.push(`/diary/${diaryId}`);
      } else if (diary) {
        await updateDiary(diary.id, { title, content });

        // 既存の日記の場合は、保存後に感情分析を実行（バックグラウンド）
        if (content.trim()) {
          try {
            const jobId = await startAsyncAnalysis(diary.id);
            if (jobId) {
              // 既存日記の編集時はバックグラウンドでポーリング
              pollAnalysisStatus(diary.id, jobId).catch(error => {
                console.error('感情分析に失敗しました:', error);
              });
            }
          } catch (error) {
            console.error('感情分析の開始に失敗しました:', error);
          }
        }
      }
    } catch (error) {
      console.error('保存に失敗しました:', error);
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
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-700" />
        </div>
      </div>
    );
  }

  if (id && !diary) {
    return (
      <div className="flex h-screen">
        <Sidebar diaries={diaries} />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
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
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
          <div className="max-w-4xl mx-auto px-24 pt-32 pb-12">
            {/* アイコンと感情分析表示 */}
            {diary?.iconData && diary?.emotionAnalysis && (
              <div className="mb-6 flex items-start gap-6">
                <EmotionIcon icon={diary.iconData} size={78} />
                <EmotionBreakdown emotionAnalysis={diary.emotionAnalysis} />
              </div>
            )}

            {/* 感情分析中の表示 */}
            {isAnalyzing && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                  <span className="text-blue-900 font-medium">感情分析中...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  {analysisProgress < 100 ? `処理中 (${analysisProgress}%)` : '完了しました'}
                </p>
              </div>
            )}

            {/* タイトル入力とボタン */}
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
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={!title.trim() && !content.trim()}
                  size="lg"
                  className="shadow-lg hover:shadow-xl px-8"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
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
                {isAnalyzing ? (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent" />
                      分析中
                    </span>
                  </>
                ) : diary.emotionAnalysis && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">感情分析済み</span>
                  </>
                )}
              </div>
            )}

            {/* エディタ */}
            {(isNewDiary || isContentInitialized) && (
              <Editor
                initialContent={content}
                onChange={setContent}
                placeholder="今日はどんな一日でしたか？"
              />
            )}
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
