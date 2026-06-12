import type { ModelSpec, ProviderKind } from "../config.js";
import type { StreamFn } from "./types.js";
import { streamOpenAI } from "./openai.js";
import { streamAnthropic } from "./anthropic.js";
import { streamGemini } from "./gemini.js";

export const STREAMERS: Record<ProviderKind, StreamFn> = {
  openai: streamOpenAI,
  anthropic: streamAnthropic,
  gemini: streamGemini,
};

/** True when the env key this model needs is present and non-empty. */
export function hasKey(spec: ModelSpec): boolean {
  const value = process.env[spec.apiKeyEnv];
  return typeof value === "string" && value.trim().length > 0;
}
