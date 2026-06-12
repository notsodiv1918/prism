import Anthropic from "@anthropic-ai/sdk";
import type { StreamFn, Usage } from "./types.js";

/** Native Anthropic streamer — used in "pro" mode (kind: "anthropic"). */
export const streamAnthropic: StreamFn = async ({
  modelId,
  apiKey,
  system,
  user,
  onToken,
  maxOutputTokens,
}): Promise<Usage> => {
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: modelId,
    max_tokens: maxOutputTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  stream.on("text", (text) => onToken(text));

  const final = await stream.finalMessage();
  return {
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
};
