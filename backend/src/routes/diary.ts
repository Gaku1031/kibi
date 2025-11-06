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
  const id = c.req.param('id');

  try {
    console.log('[Analyze Start] Starting analysis job', { diaryId: id });

    // 日記の取得
    const diary = await diaryService.getDiary(id);

    if (!diary) {
      console.warn('[Analyze Start] Diary not found', { diaryId: id });
      return c.json({
        error: 'Diary not found',
        details: 'The specified diary ID does not exist',
        code: 'DIARY_NOT_FOUND'
      }, 404);
    }

    // 空のコンテンツチェック
    if (!diary.content || diary.content.trim().length === 0) {
      console.warn('[Analyze Start] Empty diary content', { diaryId: id });
      return c.json({
        error: 'Cannot analyze empty diary',
        details: 'The diary content is empty',
        code: 'EMPTY_CONTENT'
      }, 400);
    }

    console.log('[Analyze Start] Diary retrieved, starting analysis job', {
      diaryId: id,
      contentLength: diary.content.length
    });

    // 非同期ジョブを開始
    const jobId = await emotionAnalysisService.startAnalysisJob(id, diary.content);

    console.log('[Analyze Start] Analysis job started successfully', {
      diaryId: id,
      jobId
    });

    return c.json({
      jobId,
      status: 'SUBMITTED',
      message: 'Analysis job started. Poll /analyze/status/:jobId for progress'
    });
  } catch (error) {
    // 詳細なエラーログ
    console.error('[Analyze Start] Error occurred:', {
      diaryId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    // AWS SDK エラーの型チェック
    const isAwsError = error && typeof error === 'object' && '$metadata' in error;

    if (isAwsError) {
      const awsError = error as any;
      const errorName = awsError.name || 'UnknownAWSError';

      console.error('[Analyze Start] AWS Error details:', {
        diaryId: id,
        errorName,
        errorCode: awsError.$metadata?.httpStatusCode,
        requestId: awsError.$metadata?.requestId
      });

      // 特定のAWSエラーをハンドリング
      if (errorName === 'ResourceNotFoundException') {
        return c.json({
          error: 'Analysis service not configured',
          details: 'The emotion analysis classifier or S3 bucket is not available',
          code: 'AWS_RESOURCE_NOT_FOUND'
        }, 503);
      }

      if (errorName === 'AccessDeniedException' || errorName === 'UnauthorizedException') {
        return c.json({
          error: 'Analysis service access denied',
          details: 'The server does not have permission to access AWS services',
          code: 'AWS_ACCESS_DENIED'
        }, 503);
      }

      if (errorName === 'ThrottlingException' || errorName === 'TooManyRequestsException') {
        return c.json({
          error: 'Too many analysis requests',
          details: 'Please wait a moment and try again',
          code: 'AWS_THROTTLED'
        }, 429);
      }

      if (errorName === 'InvalidRequestException' || errorName === 'ValidationException') {
        return c.json({
          error: 'Invalid analysis request',
          details: 'The diary content could not be analyzed',
          code: 'AWS_INVALID_REQUEST'
        }, 400);
      }

      // その他のAWSエラー
      return c.json({
        error: 'Analysis service error',
        details: process.env.NODE_ENV === 'development'
          ? `AWS Error: ${errorName}`
          : 'An error occurred with the analysis service',
        code: 'AWS_ERROR'
      }, 503);
    }

    // 一般的なエラー
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('timeout')) {
      return c.json({
        error: 'Analysis request timed out',
        details: 'The analysis service did not respond in time. Please try again.',
        code: 'TIMEOUT'
      }, 504);
    }

    if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return c.json({
        error: 'Network error',
        details: 'Could not connect to the analysis service',
        code: 'NETWORK_ERROR'
      }, 503);
    }

    // デフォルトエラー
    return c.json({
      error: 'Failed to start analysis',
      details: process.env.NODE_ENV === 'development'
        ? errorMessage
        : 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
});

// 分析ジョブのステータスをチェック
app.get('/:id/analyze/status/:jobId', async (c) => {
  try {
    const id = c.req.param('id');
    const jobId = c.req.param('jobId');

    console.log('[Analyze Status] Checking job status', { diaryId: id, jobId });

    const statusResult = await emotionAnalysisService.checkJobStatus(jobId);
    console.log('[Analyze Status] Job status checked', {
      diaryId: id,
      jobId,
      status: statusResult.status,
      progress: statusResult.progress
    });

    // 完了している場合は結果を取得して保存
    if (statusResult.status === 'COMPLETED') {
      console.log('[Analyze Status] Job completed, fetching results', { diaryId: id, jobId });

      const emotionResult = await emotionAnalysisService.getJobResult(id, jobId);
      console.log('[Analyze Status] Emotion results fetched from S3', {
        diaryId: id,
        jobId,
        emotionResult: JSON.stringify(emotionResult, null, 2)
      });

      const analysis: EmotionAnalysis = {
        diaryId: id,
        ...emotionResult,
        analyzedAt: new Date().toISOString(),
      };

      console.log('[Analyze Status] Analysis object prepared, saving to DB', {
        diaryId: id,
        analysis: JSON.stringify(analysis, null, 2)
      });

      // 分析結果を保存
      await emotionAnalysisDBService.saveAnalysis(analysis);
      console.log('[Analyze Status] Analysis saved to DynamoDB successfully', { diaryId: id });

      // 日記データを取得
      const diary = await diaryService.getDiary(id);
      console.log('[Analyze Status] Diary data retrieved', {
        diaryId: id,
        diaryFound: !!diary
      });

      // アイコンデータを生成
      const seed = parseInt(id.slice(-6), 16);
      console.log('[Analyze Status] Generating emotion icon', {
        diaryId: id,
        seed,
        emotions: analysis.emotions
      });

      const iconData = generateEmotionIcon(analysis, seed);
      console.log('[Analyze Status] Emotion icon generated', {
        diaryId: id,
        iconData: JSON.stringify(iconData, null, 2)
      });

      const response = {
        status: 'COMPLETED',
        diary: {
          ...diary,
          emotionAnalysis: analysis,
          iconData
        }
      };

      console.log('[Analyze Status] Returning completed response', {
        diaryId: id,
        hasEmotionAnalysis: !!response.diary.emotionAnalysis,
        hasIconData: !!response.diary.iconData
      });

      return c.json(response);
    }

    // 進行中または失敗
    console.log('[Analyze Status] Job not completed, returning status', {
      diaryId: id,
      jobId,
      status: statusResult.status
    });

    return c.json({
      status: statusResult.status,
      progress: statusResult.progress
    });
  } catch (error) {
    console.error('[Analyze Status] Error occurred:', {
      diaryId: c.req.param('id'),
      jobId: c.req.param('jobId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return c.json({ error: 'Failed to check analysis status' }, 500);
  }
});

export default app;