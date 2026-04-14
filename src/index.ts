import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import cron from "node-cron";
import { runSync } from "./sync";
import apiRoutes from "./routes";

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// CORS — only allow requests from the parent Vue app's domain
// Set ALLOWED_ORIGINS in .env as a comma-separated list of domains
// e.g. ALLOWED_ORIGINS=https://parentapp.com,https://staging.parentapp.com
// ─────────────────────────────────────────────────────────────────────────────

const rawOrigins = process.env.ALLOWED_ORIGINS ?? "";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn("⚠️  ALLOWED_ORIGINS is not set — all CORS requests will be blocked.");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin header) e.g. curl, Postman
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

const PORT = process.env.PORT ?? 3000;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 * * * *";

// ─────────────────────────────────────────────────────────────────────────────
// Read API — data endpoints for your Vue component
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api", apiRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Sync + admin routes
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/sync", async (_req: Request, res: Response) => {
  console.log("Manual sync triggered via POST /sync");
  const result = await runSync();
  res.status(result.success ? 200 : 207).json(result);
});

app.get("/schedule", (_req: Request, res: Response) => {
  res.json({ cronSchedule: CRON_SCHEDULE });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cron job
// ─────────────────────────────────────────────────────────────────────────────

if (!cron.validate(CRON_SCHEDULE)) {
  console.error(`Invalid CRON_SCHEDULE: "${CRON_SCHEDULE}". Check your .env file.`);
  process.exit(1);
}

cron.schedule(CRON_SCHEDULE, async () => {
  console.log(`\nCron triggered (schedule: ${CRON_SCHEDULE})`);
  await runSync();
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`⚽ Football-data sync service running on port ${PORT}`);
  console.log(`   Sync schedule : ${CRON_SCHEDULE}`);
  console.log(`   Manual trigger: POST http://localhost:${PORT}/sync`);
  console.log(`   Health check  : GET  http://localhost:${PORT}/health`);
  console.log(`   Read API      : GET  http://localhost:${PORT}/api/...`);
  console.log(`   Allowed origins: ${allowedOrigins.join(", ") || "none set"}`);
});
