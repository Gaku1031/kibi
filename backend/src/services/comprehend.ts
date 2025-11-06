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

      // Comprehendの出力パスは output/{diaryId}/223708988018-CLN-{jobId}/output/output.tar.gz
      // しかし、tar.gzの中にpredictions.jsonlがある
      // まずtar.gzの場所を特定するためにプレフィックスで検索
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const listCommand = new ListObjectsV2Command({
        Bucket: CONTENT_BUCKET,
        Prefix: `output/${diaryId}/`,
      });

      const listResult = await s3Client.send(listCommand);
      console.log(`[Comprehend] Found ${listResult.Contents?.length || 0} objects under output/${diaryId}/`);

      // output.tar.gzを探す
      const tarGzFile = listResult.Contents?.find(obj => obj.Key?.endsWith('output.tar.gz'));

      if (!tarGzFile?.Key) {
        console.error('[Comprehend] output.tar.gz not found in S3');
        throw new Error('Comprehend output file not found');
      }

      console.log(`[Comprehend] Found tar.gz file: ${tarGzFile.Key}`);

      // tar.gzをダウンロード
      const getCommand = new GetObjectCommand({
        Bucket: CONTENT_BUCKET,
        Key: tarGzFile.Key,
      });

      const result = await s3Client.send(getCommand);
      const buffer = await result.Body?.transformToByteArray();

      if (!buffer) {
        console.error('[Comprehend] Empty tar.gz from S3');
        throw new Error('Empty result file');
      }

      console.log(`[Comprehend] Downloaded tar.gz, size: ${buffer.length} bytes`);

      // tar.gzを展開してpredictions.jsonlを読む
      const { default: pako } = await import('pako');
      const { default: tar } = await import('tar-stream');

      // gzip解凍
      const decompressed = pako.ungzip(buffer);
      console.log(`[Comprehend] Decompressed size: ${decompressed.length} bytes`);

      // tarから predictions.jsonl を抽出
      return new Promise((resolve, reject) => {
        const extract = tar.extract();
        let foundPredictions = false;

        extract.on('entry', (header: any, stream: any, next: any) => {
          console.log(`[Comprehend] Found file in tar: ${header.name}`);

          if (header.name === 'predictions.jsonl') {
            foundPredictions = true;
            const chunks: Buffer[] = [];

            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => {
              const content = Buffer.concat(chunks).toString('utf-8');
              console.log(`[Comprehend] predictions.jsonl content length: ${content.length}`);

              try {
                const lines = content.trim().split('\n');
                console.log(`[Comprehend] Found ${lines.length} lines in predictions.jsonl`);

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

                resolve(emotions);
              } catch (parseError) {
                console.error('[Comprehend] Failed to parse predictions.jsonl:', parseError);
                reject(parseError);
              }
              next();
            });

            stream.on('error', (err: Error) => {
              console.error('[Comprehend] Stream error:', err);
              reject(err);
            });
          } else {
            // Skip this entry
            stream.resume();
            next();
          }
        });

        extract.on('finish', () => {
          if (!foundPredictions) {
            console.error('[Comprehend] predictions.jsonl not found in tar.gz');
            reject(new Error('predictions.jsonl not found in archive'));
          }
        });

        extract.on('error', (err: Error) => {
          console.error('[Comprehend] Tar extraction error:', err);
          reject(err);
        });

        // Write decompressed data to extract stream
        extract.end(decompressed);
      });
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