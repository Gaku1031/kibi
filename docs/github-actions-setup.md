# GitHub Actions自動デプロイのセットアップ

## 1. AWS IAMロールの作成（OIDC認証）

GitHub ActionsからAWSにアクセスするためのIAMロールを作成します。

### 信頼ポリシーの作成

`github-actions-trust-policy.json` を作成:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::223708988018:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/kibi:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**注意**: `YOUR_GITHUB_USERNAME` を実際のGitHubユーザー名に置き換えてください。

### OIDCプロバイダーの作成（初回のみ）

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### IAMロールの作成

```bash
# IAMロールを作成
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-actions-trust-policy.json

# 必要なポリシーをアタッチ
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess

# ロールARNを取得
aws iam get-role \
  --role-name GitHubActionsDeployRole \
  --query 'Role.Arn' \
  --output text
```

## 2. GitHubシークレットの設定

GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** で以下を追加:

- `AWS_ROLE_ARN`: 上記で作成したロールのARN
  - 例: `arn:aws:iam::223708988018:role/GitHubActionsDeployRole`

## 3. 動作フロー

mainブランチにマージすると自動的に：

1. **Comprehendエンドポイント確認**
   - 既存エンドポイントをチェック
   - なければ新規作成（15-20分待機）

2. **バックエンドデプロイ**
   - CDKでインフラ更新
   - Lambda関数にエンドポイントARN設定

3. **Amplify更新**
   - API URLを環境変数に設定
   - 自動ビルド＆デプロイをトリガー

## 4. 初回デプロイ手順

### 手動でインフラをデプロイ

```bash
cd infrastructure
npm run deploy
```

デプロイ後、出力される `ApiURL` をメモします。

### Amplifyアプリを作成

AWSコンソールまたはCLIで作成（詳細は `AMPLIFY_SETUP.md` 参照）

### 初回デプロイをトリガー

```bash
git add .
git commit -m "Setup automated deployment"
git push origin main
```

GitHub Actionsが自動的に：
- Comprehendエンドポイントを作成
- インフラをデプロイ
- Amplifyを更新

## 5. 開発フロー

### 開発ブランチ

```bash
git checkout -b feature/new-feature
# 開発...
git push origin feature/new-feature
```

開発ブランチでは **GitHub Actionsは実行されません**（エンドポイント作成されず、コスト発生なし）

### 本番デプロイ

```bash
git checkout main
git merge feature/new-feature
git push origin main
```

mainにマージすると **自動的にすべてデプロイ**されます。

## 6. コスト管理

### 開発中（mainにマージしない）
- Comprehendエンドポイント: **$0**（作成されない）
- Lambda: 無料枠内
- DynamoDB: 無料枠内
- 合計: **ほぼ$0**

### 本番環境（mainにマージ後）
- Comprehendエンドポイント: **~$40/月**
- Amplify Hosting: **$0-5/月**
- その他: **$5-10/月**
- 合計: **~$50/月**

### エンドポイントの手動削除（コスト削減）

使わない期間はエンドポイントを削除:

```bash
aws comprehend delete-endpoint \
  --endpoint-arn arn:aws:comprehend:ap-northeast-1:223708988018:document-classifier-endpoint/kibi-emotion-endpoint
```

次回のmainマージ時に自動的に再作成されます。

## トラブルシューティング

### GitHub Actionsが失敗する

1. **IAMロールの権限を確認**
   ```bash
   aws iam get-role --role-name GitHubActionsDeployRole
   ```

2. **シークレットが正しく設定されているか確認**
   - GitHubリポジトリのSettings → Secrets

3. **ログを確認**
   - GitHub ActionsのWorkflowログを確認

### Comprehendエンドポイント作成が遅い

エンドポイント作成には15-20分かかります。GitHub Actionsは最大30分待機します。
