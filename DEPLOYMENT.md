# Kibi デプロイ手順

## 🏗️ アーキテクチャ

- **バックエンド**: AWS Lambda + API Gateway (CDKでデプロイ)
- **フロントエンド**: AWS Amplify Hosting (GitHubと連携)
- **データベース**: DynamoDB
- **AI**: AWS Comprehend + Translate

## 🚀 デプロイ手順

### 1. 前提条件

- AWS CLI設定済み
- GitHub リポジトリ
- Node.js 20+

### 2. GitHub Actions用のIAM設定

```bash
# 1. OpenID Connect プロバイダーを作成
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --client-id-list sts.amazonaws.com

# 2. IAMロールを作成（trust-policy.jsonを使用）
aws iam create-role \
  --role-name GitHubActionsRole \
  --assume-role-policy-document file://trust-policy.json

# 3. 必要な権限をアタッチ
aws iam attach-role-policy \
  --role-name GitHubActionsRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

**trust-policy.json**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_USERNAME/kibi:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

### 3. GitHub Secrets設定

リポジトリの Settings > Secrets and variables > Actions で設定：

- `AWS_ROLE_ARN`: `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsRole`

### 4. バックエンドデプロイ

```bash
# mainブランチにプッシュすると自動デプロイ
git push origin main
```

または手動デプロイ：

```bash
cd infrastructure
npm install
npx cdk bootstrap
npx cdk deploy
```

### 5. フロントエンドデプロイ（AWS Amplify）

#### 5.1 Amplify Hostingセットアップ

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) にアクセス
2. 「新しいアプリ」→「ホスティング」を選択
3. GitHubを選択してリポジトリを接続
4. ブランチ: `main` を選択
5. ビルド設定で `amplify.yml` を使用

#### 5.2 環境変数設定

Amplify Console で以下の環境変数を設定：

```
NEXT_PUBLIC_API_URL=https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod
```

**重要**: URLの末尾にスラッシュを**つけないでください**。

API URLは GitHub Actions の出力またはCloudFormationスタックの出力から取得できます。

#### 5.3 デプロイ実行

Amplify Console で「デプロイ」をクリックするか、mainブランチにプッシュすると自動デプロイされます。

### 6. Comprehendカスタム分類モデル（オプション）

#### 6.1 学習データ準備

```bash
cd data/comprehend-training
node generate-training-data.js
```

#### 6.2 S3にアップロード

```bash
aws s3 cp emotion-training-data.csv s3://YOUR_BUCKET/training-data/
```

#### 6.3 Comprehendでモデル学習

1. [Amazon Comprehend Console](https://console.aws.amazon.com/comprehend/) にアクセス
2. 「カスタム分類」→「分類器を作成」
3. 学習データを指定してモデルを作成
4. エンドポイントを作成

#### 6.4 環境変数更新

Lambda関数の環境変数に追加：
```
COMPREHEND_ENDPOINT_ARN=arn:aws:comprehend:ap-northeast-1:ACCOUNT:document-classifier-endpoint/ENDPOINT_NAME
```

## 🔧 トラブルシューティング

### CDKブートストラップエラー

```bash
cd infrastructure
npx cdk bootstrap --require-approval never
```

### Amplifyビルドエラー

1. Node.js バージョンを確認（20推奨）
2. `amplify.yml` の設定を確認
3. 環境変数 `NEXT_PUBLIC_API_URL` を確認

### API接続エラー

1. CORS設定を確認
2. API Gateway URLを確認
3. Lambda関数のログを確認

## 📊 コスト見積もり

- **Lambda**: ~$5-10/月（軽い使用）
- **DynamoDB**: ~$2-5/月（オンデマンド）
- **API Gateway**: ~$3-7/月
- **Amplify Hosting**: ~$1-3/月
- **Comprehend**: ~$1-3/月（分析頻度による）

**合計**: 約 $12-28/月

## 🔄 更新手順

### バックエンド更新
```bash
git push origin main  # 自動デプロイ
```

### フロントエンド更新
```bash
git push origin main  # Amplifyが自動デプロイ
```

## 🛡️ セキュリティ

- IAMロールは最小権限の原則に従って設定
- API Gatewayでレート制限を設定
- DynamoDBは暗号化有効
- Amplifyは HTTPS 強制