/**
 * Talks to the Python evaluation service. The service is OPTIONAL: if it is
 * unreachable, scoring returns null and the UI shows "—". The core
 * compare-models experience never depends on it being up.
 */

import type { TaskType } from "../config.js";

export interface EvalScores {
  relevance: number; // 0–100
  structure: number; // 0–100
  completeness: number; // 0–100
  overall: number; // 0–100
  judged_by: string; // "heuristic" | model id used as judge
}

const EVAL_URL = process.env.EVAL_SERVICE_URL ?? "http://localhost:8000";

export async function scoreResponse(
  task: TaskType,
  request: string,
  response: string,
): Promise<EvalScores | null> {
  if (!response.trim()) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(`${EVAL_URL}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, request, response }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as EvalScores;
  } catch {
    // Service down, timed out, or not started — that's fine.
    return null;
  }
}
