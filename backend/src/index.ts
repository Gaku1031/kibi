import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import diaryRoutes from "./routes/diary.js";

const app = new Hono();

// ミドルウェア
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// ヘルスチェック
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API ルート
app.route("/diary", diaryRoutes);

// 404 ハンドラー
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Lambda Web Adapter用のHTTPサーバー起動
const port = parseInt(process.env.PORT || "8080");

console.log(`Starting server on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
