# AWS Amplify Hosting セットアップ手順

## 前提条件
- GitHubリポジトリにコードがプッシュされている
- AWS CLIが設定済み

## 手順

### 1. バックエンドのデプロイ

```bash
cd infrastructure
npm run deploy
```

デプロイ完了後、`ApiURL` をメモしておきます。

### 2. AWS Amplify アプリの作成（AWSコンソール）

1. AWS Management Console → **AWS Amplify** を開く
2. **新しいアプリ** → **ホストするウェブアプリ** をクリック
3. **GitHub** を選択し、リポジトリを接続
4. リポジトリとブランチを選択:
   - リポジトリ: `kibi`
   - ブランチ: `main`
5. **ビルド設定を編集**:
   - アプリのルートディレクトリ: `front`
   - ビルドコマンド: `amplify.yml` を使用（自動検出）
6. **環境変数を追加**:
   - `NEXT_PUBLIC_API_URL` = `<手順1でメモしたApiURL>`
7. **保存してデプロイ** をクリック

### 3. AWS Amplify アプリの作成（CLI）

```bash
# Amplify アプリの作成
aws amplify create-app \
  --name kibi-frontend \
  --repository https://github.com/<YOUR_USERNAME>/kibi \
  --access-token <GITHUB_PERSONAL_ACCESS_TOKEN>

# 出力されたappIdをメモ
APP_ID=<出力されたappId>

# ブランチを接続
aws amplify create-branch \
  --app-id $APP_ID \
  --branch-name main \
  --enable-auto-build

# 環境変数を設定
aws amplify update-app \
  --app-id $APP_ID \
  --environment-variables NEXT_PUBLIC_API_URL=<ApiURL>

# ビルド設定
aws amplify update-branch \
  --app-id $APP_ID \
  --branch-name main \
  --framework Next.js
```

### 4. デプロイの確認

1. Amplify Console でビルドの進行状況を確認
2. ビルド完了後、提供されたURLにアクセス
3. 正常に動作することを確認

## コスト

- **Amplify Hosting**:
  - ビルド時間: 最初の1000分/月無料、以降$0.01/分
  - ホスティング: 最初の15GB/月無料、以降$0.15/GB
  - 通常使用: 月額$0〜$5程度

- **Comprehendエンドポイント**（オプション）:
  - 本番環境のみ使用: 月額$40程度
  - 開発中は削除推奨

## Comprehendエンドポイントの削除（開発中）

```bash
aws comprehend delete-endpoint \
  --endpoint-arn arn:aws:comprehend:ap-northeast-1:223708988018:document-classifier-endpoint/kibi-emotion-endpoint
```

エンドポイント削除後は、バックエンドが自動的にモック実装にフォールバックします。

## 本番環境でのComprehendエンドポイント作成

```bash
aws comprehend create-endpoint \
  --endpoint-name kibi-emotion-endpoint \
  --model-arn arn:aws:comprehend:ap-northeast-1:223708988018:document-classifier/kibi-emotion-classifier \
  --desired-inference-units 1

# ステータス確認（IN_SERVICEになるまで15-20分）
aws comprehend describe-endpoint \
  --endpoint-arn <出力されたエンドポイントARN>
```
