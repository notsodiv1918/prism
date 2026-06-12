export type ProviderId = "openai" | "anthropic" | "gemini";

export type TaskType = "general" | "coding" | "content" | "research" | "support";

export interface ModelInfo {
  key: ProviderId;
  id: string;
  label: string;
  color: string;
  configured: boolean;
}

export interface TaskInfo {
  key: TaskType;
  label: string;
  hint: string;
}

export interface AppConfig {
  models: ModelInfo[];
  tasks: TaskInfo[];
}

export interface EvalScores {
  relevance: number;
  structure: number;
  completeness: number;
  overall: number;
  judged_by: string;
}

export type ColumnStatus =
  | "idle"
  | "starting"
  | "streaming"
  | "done"
  | "error";

export interface ColumnState {
  key: ProviderId;
  label: string;
  color: string;
  status: ColumnStatus;
  text: string;
  system?: string;
  user?: string;
  error?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  scores?: EvalScores;
}

/* Events emitted by the gateway over SSE. */
export type StreamEvent =
  | { type: "start"; model: ProviderId; label: string; color: string }
  | { type: "prompt"; model: ProviderId; system: string; user: string }
  | { type: "token"; model: ProviderId; text: string }
  | {
      type: "done";
      model: ProviderId;
      latencyMs: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }
  | { type: "eval"; model: ProviderId; scores: EvalScores }
  | { type: "error"; model: ProviderId; message: string }
  | { type: "all_done" };
