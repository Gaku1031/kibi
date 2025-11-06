# Amazon Comprehend カスタム分類器セットアップガイド

## S3バケットの作成と設定

### 重要な設定事項

#### 1. リージョンの一致（最重要）
- **必須**: S3バケットとComprehendは同じリージョンに作成する必要があります
- 推奨リージョン: `ap-northeast-1` (東京)

```bash
# AWS CLIでバケット作成
aws s3 mb s3://kibi-comprehend-training --region ap-northeast-1
```

#### 2. バケット名の命名規則
- グローバルで一意である必要があります
- 推奨パターン: `<project-name>-comprehend-training-<account-id>`
- 例: `kibi-comprehend-training-123456789012`

#### 3. バケットポリシーの設定

ComprehendがS3にアクセスできるようにバケットポリシーを設定します：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ComprehendAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "comprehend.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "YOUR-ACCOUNT-ID"
        }
      }
    }
  ]
}
```

適用方法：
```bash
# policy.jsonに上記を保存してから実行
aws s3api put-bucket-policy --bucket YOUR-BUCKET-NAME --policy file://policy.json
```

#### 4. IAMロールの作成

Comprehendが使用するIAMロールを作成します：

```bash
# 1. IAMロールの作成
aws iam create-role \
  --role-name ComprehendDataAccessRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Service": "comprehend.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }]
  }'

# 2. S3アクセス用のインラインポリシーを追加
aws iam put-role-policy \
  --role-name ComprehendDataAccessRole \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }]
  }'
```

#### 5. 暗号化設定（推奨）

セキュリティのため、S3サーバー側暗号化を有効にします：

```bash
aws s3api put-bucket-encryption \
  --bucket YOUR-BUCKET-NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

#### 6. バージョニング（オプション）

トレーニングデータの変更履歴を保持したい場合：

```bash
aws s3api put-bucket-versioning \
  --bucket YOUR-BUCKET-NAME \
  --versioning-configuration Status=Enabled
```

#### 7. パブリックアクセスのブロック（推奨）

セキュリティのため、パブリックアクセスをブロックします：

```bash
aws s3api put-public-access-block \
  --bucket YOUR-BUCKET-NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

## フォルダ構造

推奨されるS3バケット内のフォルダ構造：

```
s3://YOUR-BUCKET-NAME/
├── training-data/
│   └── emotion-training-data.csv
├── output/                          # Comprehendの出力用
│   └── (自動生成)
└── models/                          # モデルのアーティファクト用
    └── (自動生成)
```

## 学習データのアップロード

```bash
# 生成したCSVファイルをアップロード
aws s3 cp data/comprehend-training/emotion-training-data.csv \
  s3://YOUR-BUCKET-NAME/training-data/emotion-training-data.csv
```

## Comprehendカスタム分類器の作成手順

### AWS CLIを使用する場合

```bash
# 1. カスタム分類器の作成
aws comprehend create-document-classifier \
  --document-classifier-name emotion-classifier \
  --data-access-role-arn arn:aws:iam::YOUR-ACCOUNT-ID:role/ComprehendDataAccessRole \
  --input-data-config S3Uri=s3://YOUR-BUCKET-NAME/training-data/emotion-training-data.csv \
  --output-data-config S3Uri=s3://YOUR-BUCKET-NAME/output/ \
  --language-code en \
  --mode MULTI_CLASS \
  --region ap-northeast-1

# 2. トレーニングのステータス確認（20-30分かかります）
aws comprehend describe-document-classifier \
  --document-classifier-arn YOUR-CLASSIFIER-ARN \
  --region ap-northeast-1

# 3. トレーニング完了後、エンドポイントを作成
aws comprehend create-endpoint \
  --endpoint-name emotion-classifier-endpoint \
  --model-arn YOUR-CLASSIFIER-ARN \
  --desired-inference-units 1 \
  --region ap-northeast-1
```

### AWSコンソールを使用する場合

1. **Amazon Comprehend コンソールにアクセス**
   - https://console.aws.amazon.com/comprehend/

2. **「Custom classification」を選択**
   - 左メニューから「Custom classification」→「Train classifier」

3. **分類器の設定**
   - Classifier name: `emotion-classifier`
   - Language: `English`
   - Classifier mode: `Multi-class mode`
   - Training data: `CSV file format`

4. **データの指定**
   - Training data location: `s3://YOUR-BUCKET-NAME/training-data/emotion-training-data.csv`
   - Output data location: `s3://YOUR-BUCKET-NAME/output/`
   - IAM role: 作成した `ComprehendDataAccessRole` を選択

5. **トレーニング開始**
   - 「Train classifier」をクリック
   - 完了まで20-30分待機

6. **エンドポイント作成**
   - トレーニング完了後、「Endpoints」タブへ
   - 「Create endpoint」をクリック
   - Endpoint name: `emotion-classifier-endpoint`
   - Inference units: `1` (開発用は最小でOK)
   - Classifier: 作成した分類器を選択

## バックエンドコードへの統合

エンドポイント作成後、バックエンドコードを更新します：

```typescript
// backend/src/services/comprehend.ts

import { ComprehendClient, ClassifyDocumentCommand } from '@aws-sdk/client-comprehend';

const comprehendClient = new ComprehendClient({ region: 'ap-northeast-1' });

// エンドポイントARNを環境変数から取得
const COMPREHEND_ENDPOINT_ARN = process.env.COMPREHEND_ENDPOINT_ARN;

export class EmotionAnalysisService {
  async analyzeEmotion(text: string) {
    // 日本語を英語に翻訳
    const translatedText = await this.translateToEnglish(text);

    // カスタム分類器で感情分析
    const command = new ClassifyDocumentCommand({
      Text: translatedText,
      EndpointArn: COMPREHEND_ENDPOINT_ARN,
    });

    const result = await comprehendClient.send(command);

    // 結果を8つの感情スコアに変換
    return this.mapToEightEmotions(result.Classes);
  }
}
```

環境変数の設定（CDK）：

```typescript
// infrastructure/lib/kibi-stack.ts

const apiFunction = new lambda.DockerImageFunction(this, 'ApiFunction', {
  // ... 他の設定 ...
  environment: {
    DIARY_TABLE_NAME: diaryTable.tableName,
    EMOTION_ANALYSIS_TABLE_NAME: emotionAnalysisTable.tableName,
    COMPREHEND_ENDPOINT_ARN: process.env.COMPREHEND_ENDPOINT_ARN || '',
  },
});

// Comprehendエンドポイントへのアクセス権限を追加
apiFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'comprehend:ClassifyDocument',
  ],
  resources: [process.env.COMPREHEND_ENDPOINT_ARN || '*'],
}));
```

## コストについて

### トレーニングコスト
- カスタム分類器のトレーニング: 約$3/トレーニング
- 1200サンプル（150/クラス × 8クラス）の場合: 約$3

### エンドポイントコスト
- Inference Unit: $0.5/時間
- 1ユニット × 24時間 × 30日 = 約$360/月

**重要**: 開発・テスト時はエンドポイントを使用しない時は削除してコストを節約しましょう！

### コスト削減の推奨事項
1. **開発環境**: エンドポイントは使用時のみ作成、使用後は削除
2. **本番環境**: Auto Scalingを設定（AWS CLIまたはコンソールで設定可能）
3. **代替案**: カスタム分類器が高コストな場合、現在のComprehend標準感情分析を継続使用

## トラブルシューティング

### エラー: AccessDeniedException
- IAMロールの権限を確認
- バケットポリシーを確認
- リージョンが一致しているか確認

### エラー: トレーニングが失敗する
- CSVフォーマットを確認（ヘッダー行: `text,label`）
- 各クラスに最低100サンプルあるか確認
- S3のファイルパスが正しいか確認

### エンドポイント呼び出しが遅い
- Inference Unitsを増やす（1 → 2以上）
- リージョンを確認（Lambdaと同じリージョンか）
