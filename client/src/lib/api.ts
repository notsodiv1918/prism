import type { AppConfig, ProviderId, StreamEvent, TaskType } from "../types";

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Could not load configuration from the gateway.");
  return (await res.json()) as AppConfig;
}

interface RunArgs {
  request: string;
  task: TaskType;
  models: ProviderId[];
  onEvent: (event: StreamEvent) => void;
  signal: AbortSignal;
}

/**
 * Streams a comparison run. Uses fetch + a ReadableStream reader (rather than
 * EventSource) so the request can POST a body, then parses the SSE frames
 * manually — each frame is a `data: {json}` line pair.
 */
export async function runCompare({
  request,
  task,
  models,
  onEvent,
  signal,
}: RunArgs): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, task, models }),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? "The gateway rejected the request.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Frames are separated by a blank line.
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as StreamEvent);
      } catch {
        // Ignore a malformed frame rather than killing the whole stream.
      }
    }
  }
}
