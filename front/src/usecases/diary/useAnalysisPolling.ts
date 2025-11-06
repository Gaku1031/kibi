'use client';

import { useEffect, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { mutate } from 'swr';
import { analysisJobsState } from '../../stores/analysisJobs';
import { diaryRepository } from '../../repositories/diary/repository';
import type { AnalysisJob } from '../../types/analysisJob';

const DIARY_LIST_KEY = 'diary-list';
const getDiaryKey = (id: string) => `diary-${id}`;
const POLLING_INTERVAL = 3000; // 3秒

export function useAnalysisPolling() {
  const [jobs, setJobs] = useRecoilState(analysisJobsState);

  const addJob = useCallback((diaryId: string, jobId: string) => {
    setJobs(prev => {
      // 既に存在する場合は追加しない
      if (prev.some(j => j.diaryId === diaryId)) {
        return prev;
      }
      return [...prev, {
        diaryId,
        jobId,
        startedAt: new Date(),
        status: 'SUBMITTED',
        progress: 10,
      }];
    });
  }, [setJobs]);

  const removeJob = useCallback((diaryId: string) => {
    setJobs(prev => prev.filter(j => j.diaryId !== diaryId));
  }, [setJobs]);

  const pollJob = useCallback(async (job: AnalysisJob) => {
    try {
      const statusResponse = await diaryRepository.checkAnalysisStatus(job.diaryId, job.jobId);

      if (statusResponse.status === 'COMPLETED' && statusResponse.diary) {
        // 分析完了 - キャッシュを更新してジョブを削除
        mutate(DIARY_LIST_KEY);
        mutate(getDiaryKey(job.diaryId), statusResponse.diary);
        removeJob(job.diaryId);
        return;
      }

      if (statusResponse.status === 'FAILED') {
        // 分析失敗 - ジョブを削除
        console.error(`Analysis failed for diary ${job.diaryId}`);
        removeJob(job.diaryId);
        return;
      }

      // 進行中 - ステータスを更新
      setJobs(prev => prev.map(j =>
        j.diaryId === job.diaryId
          ? { ...j, status: statusResponse.status as any, progress: statusResponse.progress || j.progress }
          : j
      ));
    } catch (error) {
      console.error(`Failed to poll analysis status for diary ${job.diaryId}:`, error);
      // エラーが発生してもジョブは保持（次回のポーリングでリトライ）
    }
  }, [removeJob, setJobs]);

  // 定期的にすべてのジョブをポーリング
  useEffect(() => {
    if (jobs.length === 0) return;

    const interval = setInterval(() => {
      jobs.forEach(job => {
        pollJob(job);
      });
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
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
