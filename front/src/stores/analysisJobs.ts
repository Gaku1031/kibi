import { atom } from 'recoil';
import type { AnalysisJob } from '../types/analysisJob';

export const analysisJobsState = atom<AnalysisJob[]>({
  key: 'analysisJobsState',
  default: [],
});
