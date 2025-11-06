FROM public.ecr.aws/lambda/nodejs:20 as builder

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

# 環境変数を設定
ENV AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap
ENV PORT=8080
ENV NODE_ENV=production

# アプリケーションを起動
CMD ["node", "dist/index.js"]