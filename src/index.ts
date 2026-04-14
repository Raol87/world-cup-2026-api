import "dotenv/config";
import express, { Request, Response } from "express";
import cron from "node-cron";
import { runSync } from "./sync";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3000;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 * * * *"; // default: every hour

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** Trigger a full sync across all endpoints */
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
});
