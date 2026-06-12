import type { Request, Response } from "express";
import {
  MODELS,
  PROVIDER_ORDER,
  TASKS,
  costFor,
  type ProviderId,
  type TaskType,
} from "../config.js";
import { optimize } from "../prompts/library.js";
import { STREAMERS, hasKey } from "../providers/index.js";
import { scoreResponse } from "../eval/client.js";

interface ChatBody {
  request?: string;
  task?: TaskType;
  models?: ProviderId[];
}

const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS ?? 1024);

/** One JSON event per SSE frame. */
function send(res: Response, event: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function validTask(task: unknown): task is TaskType {
  return TASKS.some((t) => t.key === task);
}

export async function chatHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as ChatBody;
  const request = (body.request ?? "").trim();
  const task: TaskType = validTask(body.task) ? body.task : "general";
  const selected = (body.models ?? PROVIDER_ORDER).filter((m) =>
    PROVIDER_ORDER.includes(m),
  );

  if (!request) {
    res.status(400).json({ error: "Request text is required." });
    return;
  }
  if (selected.length === 0) {
    res.status(400).json({ error: "Select at least one model." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Each model runs independently and concurrently. One slow or failing model
  // never blocks the others — they stream in parallel into the same channel.
  const runs = selected.map(async (provider) => {
    const spec = MODELS[provider];
    const { system, user } = optimize(provider, task, request);

    send(res, { type: "start", model: provider, label: spec.label, color: spec.color });
    send(res, { type: "prompt", model: provider, system, user });

    if (!hasKey(spec)) {
      send(res, {
        type: "error",
        model: provider,
        message: `No API key. Add ${spec.apiKeyEnv} to your .env file and restart.`,
      });
      return;
    }

    const started = Date.now();
    let collected = "";
    try {
      const usage = await STREAMERS[spec.kind]({
        modelId: spec.id,
        apiKey: process.env[spec.apiKeyEnv] ?? "",
        baseUrl: spec.baseUrl,
        system,
        user,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        onToken: (text) => {
          collected += text;
          send(res, { type: "token", model: provider, text });
        },
      });

      const latencyMs = Date.now() - started;
      const costUsd = costFor(spec, usage.inputTokens, usage.outputTokens);
      send(res, {
        type: "done",
        model: provider,
        latencyMs,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd,
      });

      const scores = await scoreResponse(task, request, collected);
      if (scores) send(res, { type: "eval", model: provider, scores });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      send(res, { type: "error", model: provider, message });
    }
  });

  await Promise.allSettled(runs);
  send(res, { type: "all_done" });
  res.end();
}
