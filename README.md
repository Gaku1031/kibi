# kibi - 感情の機微を発見する日記サービス

Notionのような快適な書き心地で、日記を書くとその文面からそのときの感情を分析してくれる日記サービスです。

## 🎯 主な機能

- **日記作成・編集**: シンプルで使いやすいテキストエディタ
- **感情分析**: AWS Comprehendによる8種類の感情分析（プルチックの感情の輪）
- **感情アイコン**: 分析結果に基づくグラデーション三角形の組み合わせ
- **一覧表示**: 日記リストとアイコン表示
- **時系列表示**: 横軸時間でアイコンを並べた感情変化の可視化

## 🏗️ アーキテクチャ

### フロントエンド
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: SWR + useState
- **Deployment**: CloudFront + S3

### バックエンド
- **Framework**: Hono
- **Runtime**: AWS Lambda (Docker + Lambda Web Adapter)
- **Language**: TypeScript
- **Database**: DynamoDB
- **AI Services**: AWS Comprehend + Translate

### インフラ
- **IaC**: AWS CDK (TypeScript)
- **CI/CD**: GitHub Actions（完全自動化）
- **Frontend Hosting**: AWS Amplify
- **Region**: ap-northeast-1 (Tokyo)

## 🚀 デプロイ手順

### クイックスタート（自動デプロイ）

```bash
# 1. リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/kibi.git
cd kibi

# 2. 初回セットアップスクリプトを実行
./scripts/initial-deploy.sh

# 3. mainブランチにプッシュすると自動デプロイ
git push origin main
```

**以降は`main`ブランチへのマージで自動デプロイされます。**

### 詳細な手順

#### 1. 前提条件

- Node.js 20+
- AWS CLI設定済み（`aws sso login`）
- GitHub リポジトリ作成済み

#### 2. Comprehend学習データの準備

```bash
cd data/comprehend-training
node generate-training-data.js

# S3にアップロード
aws s3 mb s3://kibi-comprehend-training
aws s3 cp emotion-training-data.csv s3://kibi-comprehend-training/training-data/
```

#### 3. Comprehendモデルのトレーニング

```bash
# S3バケットポリシーを設定
aws s3api put-bucket-policy \
  --bucket kibi-comprehend-training \
  --policy file://infrastructure/policy.json

# IAMロールを作成（AWSコンソールで実行）
# 詳細: docs/comprehend-setup.md を参照

# カスタム分類器を作成
aws comprehend create-document-classifier \
  --document-classifier-name kibi-emotion-classifier \
  --data-access-role-arn arn:aws:iam::YOUR_ACCOUNT:role/ComprehendDataAccessRole \
  --input-data-config S3Uri=s3://kibi-comprehend-training/training-data/emotion-training-data.csv \
  --output-data-config S3Uri=s3://kibi-comprehend-training/output/ \
  --language-code en

# トレーニング完了まで待機（30-40分）
```

#### 4. GitHub Actions設定

詳細は [`docs/github-actions-setup.md`](docs/github-actions-setup.md) を参照

```bash
# OIDCプロバイダー作成（初回のみ）
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# IAMロール作成
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-actions-trust-policy.json

# ポリシーアタッチ
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

GitHubシークレット設定:
- `AWS_ROLE_ARN`: IAMロールのARN

#### 5. Amplify設定

詳細は [`AMPLIFY_SETUP.md`](AMPLIFY_SETUP.md) を参照

AWSコンソールで:
1. AWS Amplify → 新しいアプリ
2. GitHubリポジトリ連携
3. ブランチ: `main`
4. アプリルート: `front`
5. 環境変数: `NEXT_PUBLIC_API_URL` (後でGitHub Actionsが自動設定)

#### 6. 自動デプロイ開始

```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

GitHub Actionsが自動的に:
1. Comprehendエンドポイント作成（初回のみ、15-20分）
2. バックエンドデプロイ（DynamoDB + Lambda）
3. Amplify環境変数更新 + フロントエンドビルド

### 開発フロー

```bash
# 開発ブランチで作業（エンドポイントなし = コスト$0）
git checkout -b feature/new-feature
# コーディング...
git push origin feature/new-feature

# 本番リリース（エンドポイント自動作成 = コスト発生）
git checkout main
git merge feature/new-feature
git push origin main  # ← 自動デプロイ実行
```

## 🛠️ 開発環境

### フロントエンド開発

```bash
cd front
npm install
npm run dev
```

http://localhost:3000 でアクセス

### バックエンド開発

```bash
cd backend
npm install
npm run dev
```

http://localhost:8080 でAPIサーバーが起動

### インフラ開発

```bash
cd infrastructure
npm install
npm run cdk diff  # 変更確認
npm run deploy    # デプロイ
```

## 📊 コスト見積もり

### 開発環境（featureブランチ）
- Comprehendエンドポイント: **$0** （作成されない）
- Lambda: 無料枠内
- DynamoDB: 無料枠内
- **月額合計: ほぼ$0**

### 本番環境（mainブランチ）
- Comprehendエンドポイント: **~$40/月** （1IU × $0.50/時間 × 24時間 × 30日）
- Amplify Hosting: **$0-5/月** （無料枠あり）
- Lambda + DynamoDB: **$5-10/月**
- **月額合計: ~$50/月**

### コスト最適化施策

- ✅ **Lambda**: ARM64 (Graviton2) 使用で20%削減
- ✅ **DynamoDB**: オンデマンド課金で使用量に応じた課金
- ✅ **Comprehend**: 開発中はエンドポイント削除で$0
- ✅ **自動化**: mainマージ時のみエンドポイント作成

## 🔧 設定

### 環境変数

**バックエンド (Lambda)**
- `DIARY_TABLE_NAME`: DynamoDBテーブル名
- `EMOTION_ANALYSIS_TABLE_NAME`: 感情分析テーブル名
- `CONTENT_BUCKET_NAME`: S3バケット名
- `PORT`: ポート番号 (8080)

**フロントエンド**
- `NODE_ENV`: 環境 (development/production)

## 📝 API仕様

### エンドポイント

- `GET /api/diary` - 日記一覧取得
- `GET /api/diary/:id` - 日記詳細取得
- `POST /api/diary` - 日記作成
- `PUT /api/diary/:id` - 日記更新
- `DELETE /api/diary/:id` - 日記削除
- `POST /api/diary/:id/analyze` - 感情分析実行

### データ構造

```typescript
interface DiaryEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  emotionAnalysis?: EmotionAnalysis;
  iconData?: EmotionIcon;
}

interface EmotionAnalysis {
  diaryId: string;
  joy: number;        // 0-1
  trust: number;      // 0-1
  fear: number;       // 0-1
  surprise: number;   // 0-1
  sadness: number;    // 0-1
  disgust: number;    // 0-1
  anger: number;      // 0-1
  anticipation: number; // 0-1
  analyzedAt: string;
}
```

## 🎨 感情アイコン

8種類の感情をグラデーション三角形で表現：

- **喜び**: 金色→オレンジ
- **信頼**: 空色→鋼青
- **恐怖**: 紫→インディゴ
- **驚き**: 黄色→金色
- **悲しみ**: ロイヤルブルー→ミッドナイトブルー
- **嫌悪**: 黄緑→オリーブ
- **怒り**: オレンジレッド→ダークレッド
- **期待**: ホットピンク→ディープピンク

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 ライセンス

MIT License

## 🙏 謝辞

- [プルチックの感情の輪](https://ja.wikipedia.org/wiki/プルチックの感情の輪) - 感情分類の理論的基盤
- [AWS Comprehend](https://aws.amazon.com/comprehend/) - 感情分析サービス
- [Hono](https://hono.dev/) - 高速なWebフレームワーク