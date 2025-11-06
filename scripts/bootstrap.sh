#!/bin/bash

# CDKブートストラップスクリプト
# 初回デプロイ時に一度だけ実行してください

set -e

echo "🚀 CDK Bootstrap開始..."

# 必要な環境変数をチェック
if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="ap-northeast-1"
fi

echo "Region: $AWS_REGION"

# CDKをインストール
echo "📦 CDK CLIをインストール中..."
npm install -g aws-cdk

# 依存関係をインストール
echo "📦 依存関係をインストール中..."
cd infrastructure
npm install

# ブートストラップ実行
echo "🔧 CDKブートストラップ実行中..."
npx cdk bootstrap --require-approval never

echo "✅ CDKブートストラップ完了！"
echo "これで GitHub Actions からのデプロイが可能になりました。"