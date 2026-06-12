import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { ModelInfo, ProviderId, TaskInfo, TaskType } from "../types";

interface Props {
  tasks: TaskInfo[];
  models: ModelInfo[];
  task: TaskType;
  setTask: (t: TaskType) => void;
  selected: Set<ProviderId>;
  toggleModel: (m: ProviderId) => void;
  value: string;
  setValue: (v: string) => void;
  running: boolean;
  onRun: () => void;
  onStop: () => void;
}

export default function Composer({
  tasks,
  models,
  task,
  setTask,
  selected,
  toggleModel,
  value,
  setValue,
  running,
  onRun,
  onStop,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content, up to a ceiling.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const canRun = value.trim().length > 0 && selected.size > 0 && !running;
  const activeTask = tasks.find((t) => t.key === task);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canRun) {
      e.preventDefault();
      onRun();
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,20,26,0.03)]">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-line px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-2xs uppercase tracking-wide text-faint">Task</span>
          <div className="flex rounded-lg bg-bg p-0.5">
            {tasks.map((t) => (
              <button
                key={t.key}
                onClick={() => setTask(t.key)}
                className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                  task === t.key
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgba(20,20,26,0.06)]"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xs uppercase tracking-wide text-faint">Models</span>
          <div className="flex gap-1.5">
            {models.map((m) => {
              const on = selected.has(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleModel(m.key)}
                  title={m.configured ? m.id : "No API key — add it to .env"}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-all ${
                    on
                      ? "border-line-strong bg-bg text-ink"
                      : "border-line text-faint hover:text-muted"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full transition-opacity"
                    style={{ backgroundColor: m.color, opacity: on ? 1 : 0.3 }}
                  />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-3 px-3.5 py-3">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={
            activeTask ? `${activeTask.hint}  (⌘/Ctrl + Enter to run)` : "Enter a request…"
          }
          className="max-h-[220px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint scroll-thin"
        />
        {running ? (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-bg"
            title="Stop"
          >
            <Square size={15} strokeWidth={2.2} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!canRun}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-bg transition-opacity disabled:opacity-25"
            title="Run (⌘/Ctrl + Enter)"
          >
            <ArrowUp size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  );
}
