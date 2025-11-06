import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import diaryRoutes from "./routes/diary.js";

console.log("=== Application Starting ===");
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  AWS_REGION: process.env.AWS_REGION,
  AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
});

const app = new Hono();

// リクエストログミドルウェア
app.use("*", async (c, next) => {
  const start = Date.now();
  console.log(`--> ${c.req.method} ${c.req.url}`);
  await next();
  const duration = Date.now() - start;
  console.log(`<-- ${c.req.method} ${c.req.url} ${c.res.status} (${duration}ms)`);
});

// CORSミドルウェア
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// ヘルスチェック
app.get("/health", (c) => {
  console.log("Health check requested");
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API ルート
app.route("/diary", diaryRoutes);

// 404 ハンドラー
app.notFound((c) => {
  console.log(`404 Not Found: ${c.req.method} ${c.req.url}`);
  return c.json({ error: "Not Found" }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  console.error("=== Unhandled Error ===");
  console.error("Error:", err);
  console.error("Stack:", err.stack);
  console.error("Request:", c.req.method, c.req.url);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

// Lambda Web Adapter用のHTTPサーバー起動
const port = parseInt(process.env.PORT || "8080");

console.log(`Starting HTTP server on port ${port}`);

try {
  serve({
    fetch: app.fetch,
    port,
  });
  console.log(`✓ Server is listening on port ${port}`);
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
