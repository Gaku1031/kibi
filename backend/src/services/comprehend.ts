import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import {
  ComprehendClient,
  StartDocumentClassificationJobCommand,
  DescribeDocumentClassificationJobCommand,
  ClassifyDocumentCommand
} from '@aws-sdk/client-comprehend';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { EmotionAnalysis, EmotionType } from '../types/index.js';

const translateClient = new TranslateClient({ region: 'ap-northeast-1' });
const comprehendClient = new ComprehendClient({ region: 'ap-northeast-1' });
const s3Client = new S3Client({ region: 'ap-northeast-1' });

// Comprehendカスタム分類器ARN（エンドポイント不要）
const EMOTION_CLASSIFIER_ARN = process.env.COMPREHEND_CLASSIFIER_ARN ||
  'arn:aws:comprehend:ap-northeast-1:223708988018:document-classifier/kibi-emotion-classifier';

// S3バケット（分析用一時ファイル保存）
const CONTENT_BUCKET = process.env.CONTENT_BUCKET_NAME || 'kibi-content-223708988018';

// 開発環境用: エンドポイントARN（指定されている場合のみ使用）
const EMOTION_CLASSIFIER_ENDPOINT = process.env.COMPREHEND_ENDPOINT_ARN;

export class EmotionAnalysisService {
  async analyzeEmotion(text: string): Promise<Omit<EmotionAnalysis, 'diaryId' | 'analyzedAt'>> {
    try {
      // エンドポイントが設定されている場合のみ実際の分析を実行
      if (EMOTION_CLASSIFIER_ENDPOINT) {
        console.log('Using Comprehend endpoint for emotion analysis');
        // 1. 日本語を英語に翻訳
        const translatedText = await this.translateToEnglish(text);

        // 2. カスタム分類器で8種類の感情分析
        const emotionScores = await this.classifyEmotions(translatedText);

        return emotionScores;
      } else {
        // エンドポイントがない場合はモック実装を使用
        console.log('No Comprehend endpoint configured, using mock emotions');
        return this.generateMockEmotions();
      }
    } catch (error) {
      console.error('Emotion analysis failed:', error);
      // エラー時はランダム値を返す（モック）
      return this.generateMockEmotions();
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

  private async classifyEmotions(text: string): Promise<Omit<EmotionAnalysis, 'diaryId' | 'analyzedAt'>> {
    const command = new ClassifyDocumentCommand({
      Text: text,
      EndpointArn: EMOTION_CLASSIFIER_ENDPOINT,
    });

    const result = await comprehendClient.send(command);

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
    if (result.Classes) {
      for (const classResult of result.Classes) {
        const emotionName = classResult.Name?.toLowerCase() as EmotionType;
        const score = classResult.Score || 0;

        if (emotionName in emotions) {
          emotions[emotionName] = score;
        }
      }
    }

    return emotions;
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