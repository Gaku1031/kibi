export interface AnalysisJob {
  diaryId: string;
  jobId: string;
  startedAt: Date;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
}
