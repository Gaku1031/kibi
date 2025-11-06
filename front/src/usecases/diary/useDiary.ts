'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { diaryRepository } from '../../repositories/diary/repository';
import type { DiaryEntry, CreateDiaryRequest, UpdateDiaryRequest } from '../../types/diary';

const getDiaryKey = (id: string) => `diary-${id}`;
const DIARY_LIST_KEY = 'diary-list';

export function useDiary(id?: string) {
  const { data, error, isLoading } = useSWR<DiaryEntry | null>(
    id ? getDiaryKey(id) : null,
    () => id ? diaryRepository.getDiary(id) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  return {
    diary: data,
    isLoading,
    error
  };
}

export function useDiaryActions() {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  const createDiary = async (data: CreateDiaryRequest): Promise<DiaryEntry> => {
    setIsCreating(true);
    try {
      const newDiary = await diaryRepository.createDiary(data);
      
      // キャッシュを更新
      mutate(DIARY_LIST_KEY);
      mutate(getDiaryKey(newDiary.id), newDiary);
      
      return newDiary;
    } finally {
      setIsCreating(false);
    }
  };

  const updateDiary = async (id: string, data: UpdateDiaryRequest): Promise<DiaryEntry | null> => {
    setIsUpdating(true);
    try {
      const updatedDiary = await diaryRepository.updateDiary(id, data);
      
      if (updatedDiary) {
        // キャッシュを更新
        mutate(DIARY_LIST_KEY);
        mutate(getDiaryKey(id), updatedDiary);
      }
      
      return updatedDiary;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteDiary = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const success = await diaryRepository.deleteDiary(id);
      
      if (success) {
        // キャッシュを更新
        mutate(DIARY_LIST_KEY);
        mutate(getDiaryKey(id), null);
      }
      
      return success;
    } finally {
      setIsDeleting(false);
    }
  };

  const analyzeDiary = async (id: string): Promise<DiaryEntry | null> => {
    setIsAnalyzing(true);
    try {
      const analyzedDiary = await diaryRepository.analyzeDiary(id);

      if (analyzedDiary) {
        // キャッシュを更新
        mutate(DIARY_LIST_KEY);
        mutate(getDiaryKey(id), analyzedDiary);
      }

      return analyzedDiary;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startAsyncAnalysis = async (id: string): Promise<string | null> => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    try {
      const response = await diaryRepository.startAnalysis(id);
      return response.jobId;
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsAnalyzing(false);
      return null;
    }
  };

  const pollAnalysisStatus = async (id: string, jobId: string): Promise<DiaryEntry | null> => {
    let attempts = 0;
    const maxAttempts = 60; // 最大3分間ポーリング（3秒間隔）

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await diaryRepository.checkAnalysisStatus(id, jobId);

        if (statusResponse.status === 'COMPLETED' && statusResponse.diary) {
          setAnalysisProgress(100);
          setIsAnalyzing(false);

          // キャッシュを更新
          mutate(DIARY_LIST_KEY);
          mutate(getDiaryKey(id), statusResponse.diary);

          return statusResponse.diary;
        }

        if (statusResponse.status === 'FAILED') {
          setIsAnalyzing(false);
          throw new Error('Analysis failed');
        }

        // 進行状況を更新
        if (statusResponse.progress !== undefined) {
          setAnalysisProgress(statusResponse.progress);
        }

        // 3秒待機
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        console.error('Failed to check analysis status:', error);
        setIsAnalyzing(false);
        throw error;
      }
    }

    setIsAnalyzing(false);
    throw new Error('Analysis timeout');
  };

  return {
    createDiary,
    updateDiary,
    deleteDiary,
    analyzeDiary,
    startAsyncAnalysis,
    pollAnalysisStatus,
    isCreating,
    isUpdating,
    isDeleting,
    isAnalyzing,
    analysisProgress
  };
}