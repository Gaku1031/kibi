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

  return {
    createDiary,
    updateDiary,
    deleteDiary,
    analyzeDiary,
    isCreating,
    isUpdating,
    isDeleting,
    isAnalyzing
  };
}