import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import {
  ComprehendClient,
  StartDocumentClassificationJobCommand,
  DescribeDocumentClassificationJobCommand
} from '@aws-sdk/client-comprehend';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { EmotionAnalysis, EmotionType } from '../types/index.js';

const translateClient = new TranslateClient({ region: 'ap-northeast-1' });
const comprehendClient = new ComprehendClient({ region: 'ap-northeast-1' });
const s3Client = new S3Client({ region: 'ap-northeast-1' });

// Comprehendカスタム分類器ARN（非同期ジョブ用、エンドポイント不要）
const EMOTION_CLASSIFIER_ARN = process.env.COMPREHEND_CLASSIFIER_ARN ||
  'arn:aws:comprehend:ap-northeast-1:223708988018:document-classifier/kibi-emotion-classifier';

// S3バケット（分析用一時ファイル保存）
const CONTENT_BUCKET = process.env.CONTENT_BUCKET_NAME || 'kibi-content-223708988018';

// IAMロール（Comprehendジョブ用）
const DATA_ACCESS_ROLE_ARN = process.env.COMPREHEND_DATA_ACCESS_ROLE_ARN ||
  'arn:aws:iam::223708988018:role/ComprehendDataAccessRole';

export class EmotionAnalysisService {
  // 非同期ジョブを開始（ジョブIDを返す）
  async startAnalysisJob(diaryId: string, text: string): Promise<string> {
    try {
      console.log(`[Comprehend] Starting async classification job for diary ${diaryId}`);

      // 1. 日本語を英語に翻訳
      const translatedText = await this.translateToEnglish(text);

      // 2. S3に翻訳済みテキストをアップロード
      const s3Key = `input/${diaryId}.txt`;
      await s3Client.send(new PutObjectCommand({
        Bucket: CONTENT_BUCKET,
        Key: s3Key,
        Body: translatedText,
        ContentType: 'text/plain',
      }));

      // 3. Comprehend分類ジョブを開始
      const command = new StartDocumentClassificationJobCommand({
        DocumentClassifierArn: EMOTION_CLASSIFIER_ARN,
        InputDataConfig: {
          S3Uri: `s3://${CONTENT_BUCKET}/${s3Key}`,
          InputFormat: 'ONE_DOC_PER_FILE',
        },
        OutputDataConfig: {
          S3Uri: `s3://${CONTENT_BUCKET}/output/${diaryId}/`,
        },
        DataAccessRoleArn: DATA_ACCESS_ROLE_ARN,
        JobName: `emotion-analysis-${diaryId}-${Date.now()}`,
      });

      const result = await comprehendClient.send(command);
      const jobId = result.JobId;

      if (!jobId) {
        throw new Error('Failed to start classification job');
      }

      console.log(`[Comprehend] Started job: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error('[Comprehend] Failed to start analysis job:', error);
      throw error;
    }
  }

  // ジョブステータスをチェック
  async checkJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
    try {
      const command = new DescribeDocumentClassificationJobCommand({ JobId: jobId });
      const result = await comprehendClient.send(command);

      const status = result.DocumentClassificationJobProperties?.JobStatus || 'UNKNOWN';

      // ステータスに応じた進捗率を返す
      let progress: number | undefined;
      switch (status) {
        case 'SUBMITTED':
          progress = 10;
          break;
        case 'IN_PROGRESS':
          progress = 50;
          break;
        case 'COMPLETED':
          progress = 100;
          break;
        case 'FAILED':
        case 'STOP_REQUESTED':
        case 'STOPPED':
          progress = 0;
          break;
        default:
          progress = undefined;
      }

      return {
        status,
        progress,
      };
    } catch (error) {
      console.error('[Comprehend] Failed to check job status:', error);
      throw error;
    }
  }

  // 完了したジョブの結果を取得
  async getJobResult(diaryId: string, jobId: string): Promise<Omit<EmotionAnalysis, 'diaryId' | 'analyzedAt'>> {
    try {
      console.log(`[Comprehend] Fetching result from S3 for diary ${diaryId}, job ${jobId}`);

      // S3から結果を取得（Comprehendの出力は predictions.jsonl）
      const outputKey = `output/${diaryId}/predictions.jsonl`;
      console.log(`[Comprehend] Attempting to fetch S3 key: ${outputKey}`);

      const command = new GetObjectCommand({
        Bucket: CONTENT_BUCKET,
        Key: outputKey,
      });

      const result = await s3Client.send(command);
      const body = await result.Body?.transformToString();

      console.log(`[Comprehend] S3 result body length: ${body?.length || 0}`);

      if (!body) {
        console.error('[Comprehend] Empty result from S3');
        throw new Error('No result found in S3');
      }

      // JSONLフォーマットをパース
      const lines = body.trim().split('\n');
      console.log(`[Comprehend] Found ${lines.length} lines in result`);

      const firstResult = JSON.parse(lines[0]);
      console.log(`[Comprehend] Parsed result:`, JSON.stringify(firstResult, null, 2));

      // Comprehendの結果から8感情のスコアを構築
      const emotions: Omit<EmotionAnalysis, 'diaryId' | 'analyzedAt'> = {
        joy: 0,
        trust: 0,
        fear: 0,
        surprise: 0,
        sadness: 0,
        disgust: 0,
        anger: 0,
        anticipation: 0,
      };

      // Classesから各感情のスコアを取得
      if (firstResult.Classes) {
        for (const classResult of firstResult.Classes) {
          const emotionName = classResult.Name?.toLowerCase() as EmotionType;
          const score = classResult.Score || 0;

          if (emotionName in emotions) {
            emotions[emotionName] = score;
          }
        }
      }

      return emotions;
    } catch (error) {
      console.error('[Comprehend] Failed to get job result:', error);
      throw error;
    }
  }

  private async translateToEnglish(text: string): Promise<string> {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: 'ja',
      TargetLanguageCode: 'en',
    });

    const result = await translateClient.send(command);
    return result.TranslatedText || text;
  }

  private generateMockEmotions(): Omit<EmotionAnalysis, 'diaryId' | 'analyzedAt'> {
    return {
      joy: Math.random() * 0.8 + 0.1,
      trust: Math.random() * 0.7 + 0.1,
      fear: Math.random() * 0.6 + 0.05,
      surprise: Math.random() * 0.5 + 0.05,
      sadness: Math.random() * 0.6 + 0.05,
      disgust: Math.random() * 0.4 + 0.05,
      anger: Math.random() * 0.5 + 0.05,
      anticipation: Math.random() * 0.7 + 0.1,
    };
  }
}