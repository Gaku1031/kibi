'use client';

import { useEffect, useCallback, useState } from 'react';
import { mutate } from 'swr';
import { diaryRepository } from '../../repositories/diary/repository';
import type { AnalysisJob } from '../../types/analysisJob';

const DIARY_LIST_KEY = 'diary-list';
const getDiaryKey = (id: string) => `diary-${id}`;
const POLLING_INTERVAL = 3000; // 3秒
const STORAGE_KEY = 'kibi_analysis_jobs';

// localStorageからジョブを取得
function getJobsFromStorage(): AnalysisJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('[useAnalysisPolling] No jobs found in localStorage');
      return [];
    }
    const jobs = JSON.parse(stored);
    console.log('[useAnalysisPolling] Loaded jobs from localStorage:', jobs.length, 'jobs');
    // 日付文字列をDateオブジェクトに変換
    return jobs.map((job: any) => ({
      ...job,
      startedAt: new Date(job.startedAt)
    }));
  } catch (error) {
    console.error('[useAnalysisPolling] Failed to load jobs from localStorage:', error);
    return [];
  }
}

// localStorageにジョブを保存
function saveJobsToStorage(jobs: AnalysisJob[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    console.log('[useAnalysisPolling] Saved jobs to localStorage:', jobs.length, 'jobs', jobs.map(j => ({ diaryId: j.diaryId, status: j.status, progress: j.progress })));
  } catch (error) {
    console.error('[useAnalysisPolling] Failed to save jobs to storage:', error);
  }
}

export function useAnalysisPolling() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);

  // マウント時にlocalStorageから読み込み
  useEffect(() => {
    console.log('[useAnalysisPolling] Hook mounted, loading jobs from localStorage');
    const loadedJobs = getJobsFromStorage();
    setJobs(loadedJobs);
  }, []);

  // ジョブが変更されたらlocalStorageに保存
  useEffect(() => {
    saveJobsToStorage(jobs);
  }, [jobs]);

  const addJob = useCallback((diaryId: string, jobId: string) => {
    console.log('[useAnalysisPolling] Adding job:', { diaryId, jobId });
    setJobs(prev => {
      // 既に存在する場合は追加しない
      if (prev.some(j => j.diaryId === diaryId)) {
        console.log('[useAnalysisPolling] Job already exists for diary:', diaryId);
        return prev;
      }
      const newJob = {
        diaryId,
        jobId,
        startedAt: new Date(),
        status: 'SUBMITTED' as const,
        progress: 10,
      };
      console.log('[useAnalysisPolling] Job added:', newJob);
      return [...prev, newJob];
    });
  }, []);

  const removeJob = useCallback((diaryId: string) => {
    console.log('[useAnalysisPolling] Removing job for diary:', diaryId);
    setJobs(prev => prev.filter(j => j.diaryId !== diaryId));
  }, []);

  const pollJob = useCallback(async (job: AnalysisJob) => {
    try {
      console.log('[useAnalysisPolling] Polling job:', { diaryId: job.diaryId, jobId: job.jobId, currentStatus: job.status });
      const statusResponse = await diaryRepository.checkAnalysisStatus(job.diaryId, job.jobId);
      console.log('[useAnalysisPolling] Poll response:', { diaryId: job.diaryId, status: statusResponse.status, progress: statusResponse.progress });

      if (statusResponse.status === 'COMPLETED' && statusResponse.diary) {
        // 分析完了 - キャッシュを更新してジョブを削除
        console.log('[useAnalysisPolling] Analysis completed for diary:', job.diaryId);
        mutate(DIARY_LIST_KEY);
        mutate(getDiaryKey(job.diaryId), statusResponse.diary);
        removeJob(job.diaryId);
        return;
      }

      if (statusResponse.status === 'FAILED') {
        // 分析失敗 - ジョブを削除
        console.error('[useAnalysisPolling] Analysis failed for diary:', job.diaryId);
        removeJob(job.diaryId);
        return;
      }

      // 進行中 - ステータスを更新
      console.log('[useAnalysisPolling] Updating job status:', { diaryId: job.diaryId, newStatus: statusResponse.status, newProgress: statusResponse.progress });
      setJobs(prev => prev.map(j =>
        j.diaryId === job.diaryId
          ? { ...j, status: statusResponse.status as any, progress: statusResponse.progress || j.progress }
          : j
      ));
    } catch (error) {
      console.error('[useAnalysisPolling] Failed to poll analysis status for diary:', job.diaryId, error);
      // エラーが発生してもジョブは保持（次回のポーリングでリトライ）
    }
  }, [removeJob, setJobs]);

  // 定期的にすべてのジョブをポーリング
  useEffect(() => {
    if (jobs.length === 0) {
      console.log('[useAnalysisPolling] No jobs to poll');
      return;
    }

    console.log('[useAnalysisPolling] Starting polling for', jobs.length, 'jobs');
    const interval = setInterval(() => {
      console.log('[useAnalysisPolling] Polling interval triggered, checking', jobs.length, 'jobs');
      jobs.forEach(job => {
        pollJob(job);
      });
    }, POLLING_INTERVAL);

    return () => {
      console.log('[useAnalysisPolling] Stopping polling interval');
      clearInterval(interval);
    };
  }, [jobs, pollJob]);

  const getJobForDiary = useCallback((diaryId: string) => {
    return jobs.find(j => j.diaryId === diaryId);
  }, [jobs]);

  return {
    jobs,
    addJob,
    removeJob,
    getJobForDiary,
  };
}
