'use client';

import useSWR from 'swr';
import { diaryRepository } from '../../repositories/diary/repository';
import type { DiaryEntry } from '../../types/diary';

const DIARY_LIST_KEY = 'diary-list';

export function useDiaryList() {
  const { data, error, mutate, isLoading } = useSWR<DiaryEntry[]>(
    DIARY_LIST_KEY,
    () => diaryRepository.getDiaries(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  const refresh = () => mutate();

  return {
    diaries: data || [],
    isLoading,
    error,
    refresh
  };
}