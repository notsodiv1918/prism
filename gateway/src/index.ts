import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MODELS, PROVIDER_ORDER, TASKS } from "./config.js";
import { hasKey } from "./providers/index.js";
import { chatHandler } from "./routes/chat.js";

// Load the single root .env (one level up from /gateway).
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Lightweight config endpoint so the client renders the exact model list,
// colors, task types, and which keys are configured — no hardcoding in the UI.
app.get("/api/config", (_req, res) => {
  res.json({
    models: PROVIDER_ORDER.map((key) => ({
      key,
      id: MODELS[key].id,
      label: MODELS[key].label,
      color: MODELS[key].color,
      configured: hasKey(MODELS[key]),
    })),
    tasks: TASKS,
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", chatHandler);

const port = Number(process.env.GATEWAY_PORT ?? 8787);
app.listen(port, () => {
  const ready = PROVIDER_ORDER.filter((k) => hasKey(MODELS[k])).map((k) => MODELS[k].label);
  console.log(`\n  Prism gateway → http://localhost:${port}`);
  console.log(
    ready.length
      ? `  Ready: ${ready.join(", ")}`
      : `  No API key found yet — add OPENROUTER_API_KEY to .env and restart.`,
  );
  console.log("");
});
