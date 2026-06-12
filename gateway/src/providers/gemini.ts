import { GoogleGenAI } from "@google/genai";
import type { StreamFn, Usage } from "./types.js";

/** Native Gemini streamer — used in "pro" mode (kind: "gemini"). */
export const streamGemini: StreamFn = async ({
  modelId,
  apiKey,
  system,
  user,
  onToken,
  maxOutputTokens,
}): Promise<Usage> => {
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContentStream({
    model: modelId,
    contents: user,
    config: { systemInstruction: system, maxOutputTokens },
  });

  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  for await (const chunk of response) {
    if (chunk.text) onToken(chunk.text);
    const meta = chunk.usageMetadata;
    if (meta) {
      usage.inputTokens = meta.promptTokenCount ?? usage.inputTokens;
      usage.outputTokens = meta.candidatesTokenCount ?? usage.outputTokens;
    }
  }
  return usage;
};
