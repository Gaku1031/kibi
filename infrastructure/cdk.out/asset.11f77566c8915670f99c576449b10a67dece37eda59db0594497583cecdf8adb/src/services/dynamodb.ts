import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DiaryEntry, EmotionAnalysis } from '../types/index.js';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const DIARY_TABLE = process.env.DIARY_TABLE_NAME || 'kibi-diary-prod';
const EMOTION_TABLE = process.env.EMOTION_ANALYSIS_TABLE_NAME || 'kibi-emotion-analysis-prod';

export class DiaryService {
  async createDiary(diary: DiaryEntry): Promise<DiaryEntry> {
    await docClient.send(new PutCommand({
      TableName: DIARY_TABLE,
      Item: diary,
    }));
    return diary;
  }

  async getDiary(id: string): Promise<DiaryEntry | null> {
    const result = await docClient.send(new GetCommand({
      TableName: DIARY_TABLE,
      Key: { id },
    }));
    return result.Item as DiaryEntry || null;
  }

  async updateDiary(id: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && value !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getDiary(id);
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: DIARY_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as DiaryEntry || null;
  }

  async deleteDiary(id: string): Promise<boolean> {
    try {
      await docClient.send(new DeleteCommand({
        TableName: DIARY_TABLE,
        Key: { id },
      }));
      return true;
    } catch {
      return false;
    }
  }

  async listDiaries(userId: string = 'anonymous'): Promise<DiaryEntry[]> {
    // 認証なしの場合は全件取得（将来的にはuserIdでフィルタ）
    const result = await docClient.send(new ScanCommand({
      TableName: DIARY_TABLE,
    }));
    
    return (result.Items as DiaryEntry[]) || [];
  }
}

export class EmotionAnalysisService {
  async saveAnalysis(analysis: EmotionAnalysis): Promise<EmotionAnalysis> {
    await docClient.send(new PutCommand({
      TableName: EMOTION_TABLE,
      Item: analysis,
    }));
    return analysis;
  }

  async getAnalysis(diaryId: string): Promise<EmotionAnalysis | null> {
    const result = await docClient.send(new GetCommand({
      TableName: EMOTION_TABLE,
      Key: { diaryId },
    }));
    return result.Item as EmotionAnalysis || null;
  }
}