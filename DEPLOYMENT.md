# Kibi デプロイメントガイド

## 前提条件

- AWS CLI設定済み
- Node.js 20以上
- Docker Desktop起動済み
- AWS CDK CLI (`npm install -g aws-cdk`)

## デプロイ手順

### 1. Comprehend学習データの生成（初回のみ）

```bash
cd data/comprehend-training
node generate-training-data.js
```

これにより `emotion-training-data.csv` が生成されます（各感情150サンプル、合計1200サンプル）。

### 2. Comprehendカスタム分類器の作成（手動、初回のみ）

1. AWSコンソールでS3バケットを作成し、`emotion-training-data.csv`をアップロード
2. Amazon Comprehend コンソールで「Custom classification」を選択
3. 新しい分類器を作成:
   - Training data: アップロードしたCSVファイルを指定
   - Language: English
   - Classifier mode: Multi-class mode
4. トレーニング完了まで待機（20-30分程度）
5. エンドポイントを作成
6. バックエンドコードでエンドポイントARNを使用するよう更新

### 3. フロントエンドのビルド

```bash
cd front
npm install
npm run build
```

これにより `out/` ディレクトリに静的ファイルが生成されます。

### 4. バックエンドとインフラのデプロイ

```bash
cd infrastructure
npm install
npm run build
cdk bootstrap  # 初回のみ
cdk deploy
```

### 5. 環境変数の設定

デプロイ後、以下の出力が表示されます:
- `CloudFrontURL`: フロントエンドのURL
- `ApiURL`: API GatewayのURL

フロントエンドの環境変数を設定する場合は、`front/.env.production`を作成:

```env
NEXT_PUBLIC_API_URL=https://your-cloudfront-domain.cloudfront.net
```

## デプロイ後の確認

1. CloudFront URLにアクセスしてフロントエンドが表示されることを確認
2. 日記を作成し、保存が動作することを確認
3. 感情分析を実行し、アイコンが生成されることを確認

## 更新時のデプロイ

### フロントエンドのみ更新

```bash
cd front
npm run build
cd ../infrastructure
cdk deploy
```

### バックエンドのみ更新

```bash
cd infrastructure
cdk deploy
```

Dockerイメージが自動的にビルドされ、Lambdaが更新されます。

### インフラ設定の更新

```bash
cd infrastructure
npm run build
cdk deploy
```

## トラブルシューティング

### Lambda関数がタイムアウトする

- `infrastructure/lib/kibi-stack.ts` でタイムアウト設定を増やす
- メモリサイズを増やす（現在512MB）

### Comprehend分析が失敗する

- カスタム分類器のエンドポイントが起動していることを確認
- IAMロールに適切な権限があることを確認
- 現在はモック実装なので、カスタム分類器統合は今後の実装

### フロントエンドが表示されない

- CloudFrontのキャッシュをクリア: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`
- S3バケットにファイルがアップロードされていることを確認

## コスト最適化

現在の設定でのコスト最適化:

- DynamoDB: PAY_PER_REQUEST（オンデマンド）
- Lambda: ARM64アーキテクチャ、512MBメモリ
- CloudFront: PRICE_CLASS_100（北米・ヨーロッパのみ）
- Point-in-Time Recovery: 無効

月間想定コスト（低トラフィック）: $5-10程度

## クリーンアップ

全リソースを削除する場合:

```bash
cd infrastructure
cdk destroy
```

注意: DynamoDBテーブルのデータも削除されます。
