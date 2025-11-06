import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { DiaryService, EmotionAnalysisService as EmotionAnalysisDBService } from '../services/dynamodb.js';
import { EmotionAnalysisService } from '../services/comprehend.js';
import { generateEmotionIcon } from '../utils/emotionIcon.js';
import type { DiaryEntry, CreateDiaryRequest, UpdateDiaryRequest, EmotionAnalysis } from '../types/index.js';

const app = new Hono();
const diaryService = new DiaryService();
const emotionAnalysisDBService = new EmotionAnalysisDBService();
const emotionAnalysisService = new EmotionAnalysisService();

// 日記一覧取得
app.get('/', async (c) => {
  try {
    const diaries = await diaryService.listDiaries();
    
    // 感情分析結果とアイコンデータを結合
    const diariesWithAnalysis = await Promise.all(
      diaries.map(async (diary) => {
        const analysis = await emotionAnalysisDBService.getAnalysis(diary.id);
        if (analysis) {
          const iconData = generateEmotionIcon(analysis, parseInt(diary.id.slice(-6), 16));
          return {
            ...diary,
            emotionAnalysis: analysis,
            iconData
          };
        }
        return diary;
      })
    );
    
    return c.json(diariesWithAnalysis);
  } catch (error) {
    console.error('Failed to get diaries:', error);
    return c.json({ error: 'Failed to get diaries' }, 500);
  }
});

// 日記詳細取得
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const diary = await diaryService.getDiary(id);
    
    if (!diary) {
      return c.json({ error: 'Diary not found' }, 404);
    }
    
    // 感情分析結果とアイコンデータを結合
    const analysis = await emotionAnalysisDBService.getAnalysis(id);
    if (analysis) {
      const iconData = generateEmotionIcon(analysis, parseInt(id.slice(-6), 16));
      return c.json({
        ...diary,
        emotionAnalysis: analysis,
        iconData
      });
    }
    
    return c.json(diary);
  } catch (error) {
    console.error('Failed to get diary:', error);
    return c.json({ error: 'Failed to get diary' }, 500);
  }
});

// 日記作成
app.post('/', async (c) => {
  try {
    const body = await c.req.json() as CreateDiaryRequest;
    
    const diary: DiaryEntry = {
      id: uuidv4(),
      userId: 'anonymous', // 将来的には認証から取得
      title: body.title,
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const createdDiary = await diaryService.createDiary(diary);
    return c.json(createdDiary, 201);
  } catch (error) {
    console.error('Failed to create diary:', error);
    return c.json({ error: 'Failed to create diary' }, 500);
  }
});

// 日記更新
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json() as UpdateDiaryRequest;
    
    const updates = {
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedDiary = await diaryService.updateDiary(id, updates);
    
    if (!updatedDiary) {
      return c.json({ error: 'Diary not found' }, 404);
    }
    
    return c.json(updatedDiary);
  } catch (error) {
    console.error('Failed to update diary:', error);
    return c.json({ error: 'Failed to update diary' }, 500);
  }
});

// 日記削除
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const success = await diaryService.deleteDiary(id);
    
    if (!success) {
      return c.json({ error: 'Diary not found' }, 404);
    }
    
    return c.json({ message: 'Diary deleted successfully' });
  } catch (error) {
    console.error('Failed to delete diary:', error);
    return c.json({ error: 'Failed to delete diary' }, 500);
  }
});

// 感情分析ジョブを開始（非同期）
app.post('/:id/analyze', async (c) => {
  try {
    const id = c.req.param('id');
    const diary = await diaryService.getDiary(id);

    if (!diary) {
      return c.json({ error: 'Diary not found' }, 404);
    }

    // 非同期ジョブを開始
    const jobId = await emotionAnalysisService.startAnalysisJob(id, diary.content);

    return c.json({
      jobId,
      status: 'SUBMITTED',
      message: 'Analysis job started. Poll /analyze/status/:jobId for progress'
    });
  } catch (error) {
    console.error('Failed to start analysis job:', error);
    return c.json({ error: 'Failed to start analysis job' }, 500);
  }
});

// 分析ジョブのステータスをチェック
app.get('/:id/analyze/status/:jobId', async (c) => {
  try {
    const id = c.req.param('id');
    const jobId = c.req.param('jobId');

    const statusResult = await emotionAnalysisService.checkJobStatus(jobId);

    // 完了している場合は結果を取得して保存
    if (statusResult.status === 'COMPLETED') {
      const emotionResult = await emotionAnalysisService.getJobResult(id, jobId);

      const analysis: EmotionAnalysis = {
        diaryId: id,
        ...emotionResult,
        analyzedAt: new Date().toISOString(),
      };

      // 分析結果を保存
      await emotionAnalysisDBService.saveAnalysis(analysis);

      // 日記データを取得
      const diary = await diaryService.getDiary(id);

      // アイコンデータを生成
      const iconData = generateEmotionIcon(analysis, parseInt(id.slice(-6), 16));

      return c.json({
        status: 'COMPLETED',
        diary: {
          ...diary,
          emotionAnalysis: analysis,
          iconData
        }
      });
    }

    // 進行中または失敗
    return c.json({
      status: statusResult.status,
      progress: statusResult.progress
    });
  } catch (error) {
    console.error('Failed to check analysis status:', error);
    return c.json({ error: 'Failed to check analysis status' }, 500);
  }
});

export default app;