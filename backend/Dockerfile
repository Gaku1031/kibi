FROM public.ecr.aws/lambda/nodejs:20 AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# すべての依存関係をインストール（devDependenciesを含む）
RUN npm ci

# ソースコードをコピー
COPY src/ ./src/
COPY tsconfig.json ./

# TypeScriptをビルド
RUN npm run build

# プロダクション用イメージ
FROM public.ecr.aws/lambda/nodejs:20

# Lambda Web Adapter（最新版）をインストール
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

# 作業ディレクトリを設定
WORKDIR ${LAMBDA_TASK_ROOT}

# package.jsonをコピー
COPY package*.json ./

# プロダクション依存関係のみインストール
RUN npm ci --only=production

# ビルドされたコードをコピー
COPY --from=builder /app/dist ./dist

# 起動スクリプトを作成
RUN printf '#!/bin/sh\nset -e\nexec node dist/index.js\n' > /var/task/run.sh && \
    chmod +x /var/task/run.sh

# 環境変数を設定 (Lambda Web Adapter用)
ENV PORT=8080
ENV NODE_ENV=production
ENV READINESS_CHECK_PORT=8080
ENV READINESS_CHECK_PATH=/health

# Lambda handler (required for Lambda Web Adapter)
CMD ["run.sh"]