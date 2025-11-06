---
marp: true
theme: default
paginate: true
backgroundColor: #fff
backgroundImage: url('https://marp.app/assets/hero-background.svg')
style: |
  section {
    font-size: 28px;
  }
  h1 {
    color: #0066cc;
  }
  code {
    background: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
  }
  pre {
    background: #2d2d2d;
    color: #f8f8f8;
  }
---

# AWS Comprehendで作る<br/>感情分析日記アプリ
## コスト最適化とアーキテクチャの工夫

---

## 自己紹介 & プロジェクト概要

**kibi** - 感情の機微を発見する日記サービス

- 📝 日記を書くと自動で感情分析
- 🎨 8感情を三角形アイコンで可視化
- 💰 **同期→非同期化で月$40削減**

**スタック**: Next.js (Amplify) + Hono (Lambda) + DynamoDB + Comprehend

---

## アーキテクチャ全体像

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Amplify    │────▶│ API Gateway  │────▶│   Lambda    │
│  (Next.js)  │     │  HTTP API    │     │   (Hono)    │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                    ┌────────────────────────────┼────────┐
                    │                            │        │
              ┌─────▼──────┐            ┌───────▼─────┐  │
              │  DynamoDB  │            │ Comprehend  │  │
              │   Tables   │            │  Custom     │  │
              └────────────┘            │ Classifier  │  │
                                        └─────────────┘  │
                                                         │
                                                    ┌────▼────┐
                                                    │   S3    │
                                                    │ Bucket  │
                                                    └─────────┘
```

---

## Comprehendカスタム分類器の作成

### Plutchikの感情の輪（8基本感情）
```
     Joy (喜び)
    /   |   \
Trust  |  Anticipation (期待)
       |
Fear - + - Anger (怒り)
       |
Sadness| Disgust (嫌悪)
    \  |  /
   Surprise (驚き)
```

### トレーニングデータ準備
```csv
CLASS,TEXT
joy,"I'm so happy today! Everything is wonderful!"
sadness,"I feel lonely and depressed."
anger,"This is so frustrating!"
...（各感情100サンプル以上）
```

**日本語→英語翻訳後、Comprehendでトレーニング（約1時間）**

---

## なぜHono on Lambda?

### 従来の課題
- API Gateway + Lambda統合: エンドポイントごとにLambda関数
- コールドスタート対策が大変
- ルーティングロジックの分散

### Honoを採用
```typescript
// backend/src/index.ts
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";

const app = new Hono();
app.route("/diary", diaryRoutes);

export const handler = handle(app);  // これだけ！
```

**1つのLambda関数でRESTful API全体を管理**

---

## Lambda関数のデプロイ方法

### Dockerマルチステージビルド

```dockerfile
FROM public.ecr.aws/lambda/nodejs:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
CMD ["dist/index.handler"]
```

**CDKから`DockerImageFunction`で直接デプロイ**

---

## AWS Comprehendカスタム分類器

### Comprehendとは？
AWS提供の自然言語処理サービス

### カスタム分類器の構築
1. **Plutchikの感情の輪**を採用（8基本感情）
   - Joy, Trust, Fear, Surprise, Sadness, Disgust, Anger, Anticipation
2. 各感情のサンプルテキストを準備（CSV形式）
3. Comprehendでモデルをトレーニング
4. カスタム分類器ARNを取得

```typescript
const CLASSIFIER_ARN =
  'arn:aws:comprehend:ap-northeast-1:xxx:document-classifier/kibi-emotion-classifier';
```

---

## Comprehend: 同期 vs 非同期

### 当初の実装（同期API）
```typescript
// ❌ エンドポイント必須 → 常時稼働で月$40
const command = new ClassifyDocumentCommand({
  EndpointArn: ENDPOINT_ARN,  // 😱 高い！
  Text: translatedText
});
```

### 改善後（非同期ジョブ）
```typescript
// ✅ エンドポイント不要 → pay-per-use
const command = new StartDocumentClassificationJobCommand({
  DocumentClassifierArn: CLASSIFIER_ARN,  // 分類器直接指定
  InputDataConfig: { S3Uri: `s3://bucket/input.txt` },
  OutputDataConfig: { S3Uri: `s3://bucket/output/` }
});
```

**月$40 → $0（実行時のみ課金）**

---

## 非同期処理の実装

### バックエンド
```typescript
// 1. ジョブ開始 → jobIdを返す
POST /diary/:id/analyze → { jobId, status: 'SUBMITTED' }

// 2. ポーリングでステータス確認（3秒間隔）
GET /diary/:id/analyze/status/:jobId
  → { status: 'IN_PROGRESS', progress: 50 }
  → { status: 'COMPLETED', diary: {...} }
```

### フロントエンド
```typescript
const jobId = await startAsyncAnalysis(diaryId);
// 3秒間隔でポーリング
await pollAnalysisStatus(diaryId, jobId);
```

**プログレスバーでUX改善**

---

## 感情アイコン生成アルゴリズム

### コンセプト
8つの感情をカラフルな三角形で表現

### 実装ポイント
```typescript
// 1. 感情スコアでサイズ決定
const size = Math.max(0.2, Math.min(1.0, value * 0.8 + 0.2));

// 2. 重複回避アルゴリズム（最小距離チェック）
const minDistance = (size + 0.3) * 30;
for (const pos of usedPositions) {
  const distance = Math.sqrt(
    Math.pow((x - pos.x) * 5, 2) + Math.pow((y - pos.y) * 5, 2)
  );
  if (distance < minDistance) return null; // 重複
}

// 3. シード値で再現性確保
const random = new SeededRandom(iconSeed);
```

---

## ハマったポイント 1: API 404エラー

### 問題
フロントエンドからAPIを呼ぶと404エラー

### 原因
```typescript
// ❌ 相対パスを使っていた
const API_BASE_URL = '/api';
// Amplify: https://xxx.amplifyapp.com/api → 存在しない
```

### 解決
```yaml
# GitHub Actions: CDKのOutputからAPI URLを取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name kibi-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiURL`].OutputValue' \
  --output text)

# Amplifyの環境変数に設定
aws amplify update-app \
  --environment-variables "NEXT_PUBLIC_API_URL=${API_URL}"
```

**インフラとフロントエンドの連携が重要**

---

## ハマったポイント 2: Lambda統合の試行錯誤

### 最初: Lambda Web Adapter
```typescript
// ❌ HTTPサーバー起動が必要 → 面倒
import { serve } from '@hono/node-server';
serve({ fetch: app.fetch, port: 8080 });
```

### 次: REST API → CORS問題
- Proxyモードでうまく動かない
- ルーティングが複雑

### 最終: HTTP API + hono/aws-lambda
```typescript
// ✅ シンプル！
import { handle } from "hono/aws-lambda";
export const handler = handle(app);
```

**公式サポートのアダプタを選ぶべき**

---

## ハマったポイント 3: CORS地獄

### 問題
CORSエラーが解消されない

### 原因
- API Gateway側のCORS設定だけでは不十分
- Lambda関数自体がCORSヘッダーを返す必要がある
- URL末尾のスラッシュで二重スラッシュ発生 (`/prod//diary`)

### 解決
```typescript
// 1. Hono側でCORSミドルウェア
app.use("*", cors({ origin: "*", ... }));

// 2. API URL末尾のスラッシュ削除
API_URL="${API_URL%/}"
```

**API Gateway + Lambda + URL整形の三位一体**

---

## AI活用の進め方（個人的な学び）

### ❌ NG: いきなりAIに丸投げ
「日記アプリ作って」→ よくある実装で終わる

### ✅ OK: 仕様を固めてからAI活用
1. **自分で調査**: Comprehendのドキュメント読む
2. **アーキテクチャ設計**: 構成図を書く
3. **仕様を明確化**: 8感情、非同期処理、など
4. **AIに実装依頼**: 具体的な指示で精度UP

**「何を作るか」は自分で考え、「どう作るか」はAIと協働**

---

## モノレポ構成のメリット

```
kibi/
├── front/           # Next.js (Amplify)
├── backend/         # Hono (Lambda)
└── infrastructure/  # AWS CDK
```

### メリット
- **環境変数の一元管理**: CDKからAPI URL取得→Amplifyに設定
- **型共有**: 同一リポジトリで型定義を共有
- **CI/CDが簡単**: GitHub Actions 1ファイルで全体デプロイ

---

## GitHub Actions CI/CD

```yaml
jobs:
  deploy:
    - Checkout code
    - Configure AWS credentials (OIDC)
    - Bootstrap CDK
    - Deploy infrastructure (CDK)
    - Get API URL from CloudFormation Output
    - Update Amplify environment variables
    - Deployment summary
```

**OIDC認証でIAMロール使用（長期クレデンシャル不要）**

---

## コスト構成（本番環境想定）

| サービス | 月額 | 備考 |
|---------|-----|------|
| Amplify Hosting | ~$5 | SSR込み |
| Lambda | ~$1 | リクエスト数少 |
| DynamoDB | ~$1 | オンデマンド |
| API Gateway | ~$1 | HTTP API |
| **Comprehend** | **$0** | **非同期化で削減** |
| S3 | ~$0.5 | 一時ファイル |
| **合計** | **~$8.5/月** | |

**同期API時は$48.5/月だった → $40削減！**

---

## まとめ

### 技術選定のポイント
✅ Hono + Lambda: シンプルなAPI構築
✅ Comprehend非同期化: コスト最適化
✅ モノレポ: 開発効率UP

### 学び
- **仕様を固めてからAI活用**が効率的
- **AWS各サービスの料金体系**を理解してアーキテクチャ選択
- **ハマりポイントは記録**してナレッジ化

### 今後の展開
- EventBridge + WebSocketでリアルタイム通知
- Cognitoで認証追加
- 感情データの時系列分析

---

## Thank you! 🎉

**GitHub**: https://github.com/your-repo/kibi *(予定)*

**質問・ディスカッション歓迎！**

---

## 補足: カスタム分類器のトレーニング詳細

### データ準備のコツ
- **各クラス最低100サンプル**推奨（50でも可）
- 多様な表現を含める（短文、長文、口語、文語）
- バランスを取る（各クラス同じくらいのサンプル数）

### トレーニングコマンド
```bash
aws comprehend create-document-classifier \
  --document-classifier-name kibi-emotion-classifier \
  --data-access-role-arn arn:aws:iam::xxx:role/ComprehendRole \
  --input-data-config S3Uri=s3://bucket/training-data.csv \
  --language-code en \
  --mode MULTI_CLASS
```

### コスト
- トレーニング: $3/hour（約1時間）
- 推論: $0.0005/100文字（非同期）

**初期コスト$3でずっと使えるモデルが手に入る**

---

## 補足: API Gateway REST API vs HTTP API

| 項目 | REST API | HTTP API |
|-----|---------|----------|
| 価格 | $3.50/百万リクエスト | $1.00/百万リクエスト |
| レイテンシ | 標準 | **最大60%低減** |
| 認証 | Lambda/Cognito/IAM | **JWT/OAuth2.0** |
| WebSocket | ❌ | ✅ |

**HTTP APIを選んだ理由**
- コスト: 1/3.5に削減
- パフォーマンス: レイテンシ低減
- 将来性: WebSocket対応予定

---

## 補足: Lambda Web Adapterとの比較

### Lambda Web Adapter（使わなかった）
- HTTPサーバーを起動してLambdaで実行
- Express/Fasifyなどを直接動かせる
- `PORT=8080`でリッスン

### hono/aws-lambda（採用）
```typescript
import { handle } from "hono/aws-lambda";
export const handler = handle(app);
```

**理由**: Hono公式サポート、コード量少、パフォーマンス最適化

---

## 補足: ポーリング vs EventBridge

### ポーリング方式（現在）
```typescript
// 3秒間隔でステータスチェック
setInterval(() => checkStatus(jobId), 3000);
```
- メリット: 実装シンプル、追加コストなし
- デメリット: 無駄なAPI呼び出し

### EventBridge + WebSocket（将来案）
```
Comprehend Job完了
  → EventBridge Rule
    → Lambda（通知）
      → API Gateway WebSocket
        → フロントエンド
```
- メリット: リアルタイム、効率的
- デメリット: 実装複雑、追加コスト

**現状はポーリングで十分**
