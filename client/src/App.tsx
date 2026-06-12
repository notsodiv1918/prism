import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "./components/TopBar";
import Composer from "./components/Composer";
import ComparisonGrid from "./components/ComparisonGrid";
import { fetchConfig, runCompare } from "./lib/api";
import type {
  AppConfig,
  ColumnState,
  ProviderId,
  StreamEvent,
  TaskType,
} from "./types";

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [task, setTask] = useState<TaskType>("general");
  const [selected, setSelected] = useState<Set<ProviderId>>(new Set());
  const [value, setValue] = useState("");

  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [columns, setColumns] = useState<Map<ProviderId, ColumnState>>(new Map());

  const abortRef = useRef<AbortController | null>(null);

  // Load model + task config from the gateway.
  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        setConfig(cfg);
        // Default selection: every model that has a key, else all of them.
        const configured = cfg.models.filter((m) => m.configured).map((m) => m.key);
        const initial = configured.length ? configured : cfg.models.map((m) => m.key);
        setSelected(new Set(initial));
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  const toggleModel = useCallback((m: ProviderId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }, []);

  const orderedSelected = useMemo<ProviderId[]>(() => {
    if (!config) return [];
    return config.models.filter((m) => selected.has(m.key)).map((m) => m.key);
  }, [config, selected]);

  const patch = useCallback(
    (model: ProviderId, fields: Partial<ColumnState>) => {
      setColumns((prev) => {
        const next = new Map(prev);
        const cur = next.get(model);
        if (cur) next.set(model, { ...cur, ...fields });
        return next;
      });
    },
    [],
  );

  const onEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "start":
          setColumns((prev) => {
            const next = new Map(prev);
            next.set(event.model, {
              key: event.model,
              label: event.label,
              color: event.color,
              status: "starting",
              text: "",
            });
            return next;
          });
          break;
        case "prompt":
          patch(event.model, { system: event.system, user: event.user });
          break;
        case "token":
          setColumns((prev) => {
            const next = new Map(prev);
            const cur = next.get(event.model);
            if (cur)
              next.set(event.model, {
                ...cur,
                status: "streaming",
                text: cur.text + event.text,
              });
            return next;
          });
          break;
        case "done":
          patch(event.model, {
            status: "done",
            latencyMs: event.latencyMs,
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            costUsd: event.costUsd,
          });
          break;
        case "eval":
          patch(event.model, { scores: event.scores });
          break;
        case "error":
          patch(event.model, { status: "error", error: event.message });
          break;
        case "all_done":
          setRunning(false);
          break;
      }
    },
    [patch],
  );

  const onRun = useCallback(async () => {
    if (!value.trim() || orderedSelected.length === 0) return;

    // Seed empty columns in display order so layout is stable before tokens land.
    const seeded = new Map<ProviderId, ColumnState>();
    for (const key of orderedSelected) {
      const info = config!.models.find((m) => m.key === key)!;
      seeded.set(key, {
        key,
        label: info.label,
        color: info.color,
        status: "starting",
        text: "",
      });
    }
    setColumns(seeded);
    setHasRun(true);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runCompare({
        request: value,
        task,
        models: orderedSelected,
        onEvent,
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        for (const key of orderedSelected) {
          patch(key, { status: "error", error: (err as Error).message });
        }
      }
    } finally {
      setRunning(false);
    }
  }, [value, orderedSelected, task, config, onEvent, patch]);

  const onStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setColumns((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        if (v.status === "streaming" || v.status === "starting") {
          next.set(k, { ...v, status: "done" });
        }
      }
      return next;
    });
  }, []);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-lg font-semibold">Gateway unreachable</h1>
          <p className="mt-2 text-sm text-muted">{loadError}</p>
          <p className="mt-3 font-mono text-[12px] text-faint">
            Start it with <span className="text-ink">npm run dev</span> from the project root.
          </p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="h-2 w-2 animate-blink rounded-full bg-faint" />
      </div>
    );
  }

  const columnList = orderedSelected
    .map((k) => columns.get(k))
    .filter((c): c is ColumnState => Boolean(c));

  return (
    <div className="flex h-full flex-col">
      <TopBar models={config.models} />
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 overflow-hidden px-5 py-4 sm:px-7">
        <Composer
          tasks={config.tasks}
          models={config.models}
          task={task}
          setTask={setTask}
          selected={selected}
          toggleModel={toggleModel}
          value={value}
          setValue={setValue}
          running={running}
          onRun={onRun}
          onStop={onStop}
        />
        <ComparisonGrid columns={columnList} hasRun={hasRun} />
      </main>
    </div>
  );
}
