import OpenAI from "openai";
import type { StreamFn, Usage } from "./types.js";

/**
 * OpenAI-compatible streamer. Works for native OpenAI AND any OpenAI-compatible
 * gateway (OpenRouter, Groq, Together, local servers) — the only difference is
 * the baseUrl and key. Uses `max_tokens` for the broadest compatibility.
 */
export const streamOpenAI: StreamFn = async ({
  modelId,
  apiKey,
  baseUrl,
  system,
  user,
  onToken,
  maxOutputTokens,
}): Promise<Usage> => {
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    // Optional attribution headers OpenRouter likes; harmless elsewhere.
    defaultHeaders: { "HTTP-Referer": "http://localhost:5173", "X-Title": "Prism" },
  });

  const stream = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxOutputTokens,
    stream: true,
    stream_options: { include_usage: true },
  });

  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) onToken(delta);
    if (chunk.usage) {
      usage.inputTokens = chunk.usage.prompt_tokens ?? usage.inputTokens;
      usage.outputTokens = chunk.usage.completion_tokens ?? usage.outputTokens;
    }
  }
  return usage;
};
