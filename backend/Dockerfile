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

# 作業ディレクトリを設定
WORKDIR ${LAMBDA_TASK_ROOT}

# package.jsonをコピー
COPY package*.json ./

# プロダクション依存関係のみインストール
RUN npm ci --only=production

# ビルドされたコードをコピー
COPY --from=builder /app/dist ./dist

# 環境変数を設定
ENV NODE_ENV=production

# Lambda handler
CMD ["dist/index.handler"]