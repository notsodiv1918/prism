import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { AlertCircle, ChevronDown, Code2 } from "lucide-react";
import type { ColumnState } from "../types";

function fmtCost(usd?: number): string {
  if (usd === undefined) return "—";
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function fmtLatency(ms?: number): string {
  if (ms === undefined) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs uppercase tracking-wide text-faint">{label}</span>
      <span className="font-mono text-[12.5px] text-ink">{value}</span>
    </div>
  );
}

function StatusDot({ state }: { state: ColumnState }) {
  if (state.status === "streaming" || state.status === "starting") {
    return (
      <span className="flex items-center gap-1.5 text-2xs text-muted">
        <span
          className="h-1.5 w-1.5 animate-blink rounded-full"
          style={{ backgroundColor: state.color }}
        />
        streaming
      </span>
    );
  }
  if (state.status === "done") {
    return <span className="text-2xs text-faint">done</span>;
  }
  if (state.status === "error") {
    return <span className="text-2xs text-[#C0564A]">error</span>;
  }
  return null;
}

export default function ModelColumn({ state }: { state: ColumnState }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const streaming = state.status === "streaming" || state.status === "starting";

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {/* Color rule — the model's identity, with a live sweep while streaming. */}
      <div className="relative h-[3px] overflow-hidden" style={{ backgroundColor: `${state.color}22` }}>
        <div className="absolute inset-y-0 left-0 w-full" style={{ backgroundColor: state.color, opacity: streaming ? 0.35 : 1 }} />
        {streaming && (
          <div
            className="absolute inset-y-0 w-[30%] animate-sweep"
            style={{ background: `linear-gradient(90deg, transparent, ${state.color}, transparent)` }}
          />
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: state.color }} />
          <span className="font-display text-[13.5px] font-semibold">{state.label}</span>
        </div>
        <StatusDot state={state} />
      </div>

      {/* Optimized-prompt disclosure — shows what this model actually received. */}
      {state.user && (
        <div className="border-b border-line">
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="flex w-full items-center gap-1.5 px-4 py-1.5 text-2xs text-muted transition-colors hover:text-ink"
          >
            <Code2 size={12} />
            Optimized prompt
            <ChevronDown
              size={12}
              className={`ml-auto transition-transform ${showPrompt ? "rotate-180" : ""}`}
            />
          </button>
          {showPrompt && (
            <div className="max-h-44 overflow-auto border-t border-line bg-bg px-4 py-2.5 scroll-thin">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">
                <span className="text-faint">system ▸ </span>
                {state.system}
                {"\n\n"}
                <span className="text-faint">user ▸ </span>
                {state.user}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3.5 scroll-thin">
        {state.status === "error" ? (
          <div className="flex items-start gap-2 rounded-lg bg-[#FBF1EF] px-3 py-2.5 text-[13px] text-[#9C4A3F]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : state.text ? (
          <div className="prose-prism">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {state.text}
            </ReactMarkdown>
            {streaming && (
              <span
                className="ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px] animate-blink"
                style={{ backgroundColor: state.color }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-1 text-[13px] text-faint">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-faint" />
            waiting for first token…
          </div>
        )}
      </div>

      {/* Metrics strip — the live instrument readout. */}
      <div className="grid grid-cols-4 gap-2 border-t border-line bg-bg px-4 py-2.5">
        <Metric label="Latency" value={fmtLatency(state.latencyMs)} />
        <Metric
          label="Tokens"
          value={
            state.outputTokens !== undefined
              ? `${state.inputTokens ?? 0}→${state.outputTokens}`
              : "—"
          }
        />
        <Metric label="Cost" value={fmtCost(state.costUsd)} />
        <Metric
          label="Quality"
          value={state.scores ? `${Math.round(state.scores.overall)}` : "—"}
        />
      </div>
    </div>
  );
}
