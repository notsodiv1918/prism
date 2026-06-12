export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export type TokenSink = (text: string) => void;

export interface StreamConfig {
  modelId: string;
  apiKey: string;
  baseUrl?: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  onToken: TokenSink;
}

/** Every provider implements this shape. */
export type StreamFn = (cfg: StreamConfig) => Promise<Usage>;
