# kibi - 技術仕様書

## 概要

感情分析機能付きの日記サービス「kibi」の技術仕様

## 技術選定

### フロントエンド

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Editor**: BlockNote (Notion ライクエディタ)
- **State Management**:
  - SWR (サーバーデータキャッシュ)
  - Recoil (グローバルステート、必要に応じて)
  - useState (ローカルステート)
- **Styling**: Tailwind CSS
- **Icon Generation**: Canvas API + SVG

### バックエンド・インフラ

- **API**: AWS Lambda (Node.js/TypeScript)
- **Database**: Amazon DynamoDB
- **File Storage**: Amazon S3 (日記テキスト保存)
- **Authentication**: Amazon Cognito (後で追加)
- **Sentiment Analysis**: AWS Comprehend
- **Translation**: Amazon Translate (日本語 → 英語)
- **Infrastructure**: AWS CDK (TypeScript)

### API 設計

```
POST /api/diary - 日記保存
GET /api/diary/:id - 日記取得
PUT /api/diary/:id - 日記更新
DELETE /api/diary/:id - 日記削除
GET /api/diary - 日記一覧取得
POST /api/diary/:id/analyze - 感情分析実行
```

## データ構造

### DiaryEntry

```typescript
interface DiaryEntry {
  id: string;
  title: string;
  content: string; // BlockNoteのJSON形式
  createdAt: Date;
  updatedAt: Date;
  emotionAnalysis?: EmotionAnalysis;
  iconData?: EmotionIcon;
}

interface EmotionAnalysis {
  joy: number; // 喜び (0-1)
  trust: number; // 信頼 (0-1)
  fear: number; // 恐怖 (0-1)
  surprise: number; // 驚き (0-1)
  sadness: number; // 悲しみ (0-1)
  disgust: number; // 嫌悪 (0-1)
  anger: number; // 怒り (0-1)
  anticipation: number; // 期待 (0-1)
  analyzedAt: Date;
}

interface EmotionIcon {
  triangles: Triangle[];
  seed: number; // 再現性のための乱数シード
}

interface Triangle {
  emotion: EmotionType;
  size: number; // 0.1-1.0
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  rotation: number; // 0-360 (度)
  gradient: {
    startColor: string;
    endColor: string;
  };
}
```

## 感情アイコン生成アルゴリズム

### 色定義（グラデーション）

```typescript
const EMOTION_COLORS = {
  joy: { start: "#FFD700", end: "#FFA500" }, // 金色→オレンジ
  trust: { start: "#87CEEB", end: "#4682B4" }, // 空色→鋼青
  fear: { start: "#800080", end: "#4B0082" }, // 紫→インディゴ
  surprise: { start: "#FFFF00", end: "#FFD700" }, // 黄色→金色
  sadness: { start: "#4169E1", end: "#191970" }, // ロイヤルブルー→ミッドナイトブルー
  disgust: { start: "#9ACD32", end: "#556B2F" }, // 黄緑→オリーブ
  anger: { start: "#FF4500", end: "#8B0000" }, // オレンジレッド→ダークレッド
  anticipation: { start: "#FF69B4", end: "#C71585" }, // ホットピンク→ディープピンク
};
```

### 生成ルール

1. 感情値が 0.1 以上の感情のみ三角形を生成
2. 三角形サイズ = 感情値 × 0.8 + 0.2 (最小 0.2, 最大 1.0)
3. 位置はランダム（重複回避アルゴリズム付き）
4. 回転角度もランダム
5. 同じ seed で同じアイコンを再現可能

## 実装フェーズ

### Phase 1: 基本機能

1. プロジェクト構造セットアップ
2. BlockNote エディタ実装
3. モック API 作成
4. 日記 CRUD 機能
5. 感情アイコン生成機能

### Phase 2: 感情分析

1. AWS Lambda 関数作成
2. DynamoDB 設計・構築
3. 感情分析 API 実装
4. フロントエンド連携

### Phase 3: 可視化・UX 改善

1. 一覧画面実装
2. 時系列表示実装
3. 未保存アラート機能
4. レスポンシブ対応

### Phase 4: 認証・本格運用

1. Cognito 認証実装
2. ユーザー管理機能
3. セキュリティ強化
4. パフォーマンス最適化

## 開発環境

- Node.js 18+
- AWS CLI
- AWS CDK CLI
- Docker (ローカル開発用)
