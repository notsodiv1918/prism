/**
 * Central model + task registry.
 *
 * Default setup uses OpenRouter's FREE models through one OpenAI-compatible
 * endpoint — a single free key, no credit card. Each slot declares which
 * "kind" of integration it uses, which env var holds its key, and (for
 * OpenAI-compatible providers) which base URL to hit.
 *
 * To go "pro" later, point any slot back at a native provider: set kind to
 * "anthropic" or "gemini", change apiKeyEnv + id, and drop baseUrl. The native
 * integrations are still in src/providers/.
 *
 * Free model IDs on OpenRouter rotate. If a column ever shows "model not found",
 * grab a current ":free" slug from https://openrouter.ai/models and paste it as
 * the `id` below — that's the only change needed.
 *
 * Prices are USD per 1,000,000 tokens. Free models are 0.
 */

export type ProviderId = "openai" | "anthropic" | "gemini";
export type ProviderKind = "openai" | "anthropic" | "gemini";

export interface ModelSpec {
  key: ProviderId;
  id: string;
  label: string;
  color: string;
  kind: ProviderKind;
  apiKeyEnv: string;
  baseUrl?: string;
  priceIn: number;
  priceOut: number;
}

const OPENROUTER = "https://openrouter.ai/api/v1";

export const MODELS: Record<ProviderId, ModelSpec> = {
  openai: {
    key: "openai",
    id: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    color: "#10A37F",
    kind: "openai",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrl: OPENROUTER,
    priceIn: 0,
    priceOut: 0,
  },
  anthropic: {
    key: "anthropic",
    id: "nex-agi/nex-n2-pro:free",   // ← your new free model
    label: "Nex N2 Pro",              // ← update label
    color: "#8B5CF6",
    kind: "openai",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrl: OPENROUTER,
    priceIn: 0,
    priceOut: 0,
  },
  gemini: {
    key: "gemini",
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B",
    color: "#4285F4",
    kind: "openai",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrl: OPENROUTER,
    priceIn: 0,
    priceOut: 0,
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["openai", "anthropic", "gemini"];

export type TaskType =
  | "general"
  | "coding"
  | "content"
  | "research"
  | "support";

export interface TaskSpec {
  key: TaskType;
  label: string;
  hint: string;
}

export const TASKS: TaskSpec[] = [
  { key: "general", label: "General", hint: "Open-ended questions and everyday requests." },
  { key: "coding", label: "Coding", hint: "Write, explain, or debug code." },
  { key: "content", label: "Content", hint: "Marketing copy, emails, posts, scripts." },
  { key: "research", label: "Research", hint: "Summaries, comparisons, structured analysis." },
  { key: "support", label: "Support", hint: "Customer replies and help responses." },
];

export function costFor(spec: ModelSpec, inTok: number, outTok: number): number {
  return (inTok / 1_000_000) * spec.priceIn + (outTok / 1_000_000) * spec.priceOut;
}
