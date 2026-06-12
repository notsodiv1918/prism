import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import Composer from "./components/Composer";
import ComparisonGrid from "./components/ComparisonGrid";
import { fetchConfig, runCompare } from "./lib/api";
import {
  loadHistory,
  loadTheme,
  persistHistory,
  saveTheme,
  type HistoryRun,
  type Theme,
} from "./lib/storage";
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

  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [history, setHistory] = useState<HistoryRun[]>(loadHistory);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [task, setTask] = useState<TaskType>("general");
  const [selected, setSelected] = useState<Set<ProviderId>>(new Set());
  const [value, setValue] = useState("");

  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [columns, setColumns] = useState<Map<ProviderId, ColumnState>>(new Map());

  const abortRef = useRef<AbortController | null>(null);
  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Apply + persist theme.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  // Load model + task config from the gateway.
  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        setConfig(cfg);
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

  const patch = useCallback((model: ProviderId, fields: Partial<ColumnState>) => {
    setColumns((prev) => {
      const next = new Map(prev);
      const cur = next.get(model);
      if (cur) next.set(model, { ...cur, ...fields });
      return next;
    });
  }, []);

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

  const saveRun = useCallback(
    (req: string, runTask: TaskType, runModels: ProviderId[]) => {
      const cols = runModels
        .map((k) => columnsRef.current.get(k))
        .filter((c): c is ColumnState => Boolean(c));
      if (!cols.some((c) => c.text || c.status === "error")) return;
      const run: HistoryRun = {
        id: `${Date.now()}`,
        ts: Date.now(),
        task: runTask,
        request: req,
        models: runModels,
        columns: cols,
      };
      setActiveId(run.id);
      setHistory((prev) => {
        const next = [run, ...prev].slice(0, 50);
        persistHistory(next);
        return next;
      });
    },
    [],
  );

  const onRun = useCallback(async () => {
    if (!value.trim() || orderedSelected.length === 0) return;
    const req = value;
    const runTask = task;
    const runModels = [...orderedSelected];

    const seeded = new Map<ProviderId, ColumnState>();
    for (const key of runModels) {
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
    setActiveId(null);
    setHasRun(true);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runCompare({ request: req, task: runTask, models: runModels, onEvent, signal: controller.signal });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        for (const key of runModels) patch(key, { status: "error", error: (err as Error).message });
      }
    } finally {
      setRunning(false);
      saveRun(req, runTask, runModels);
    }
  }, [value, orderedSelected, task, config, onEvent, patch, saveRun]);

  const onStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setColumns((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        if (v.status === "streaming" || v.status === "starting") next.set(k, { ...v, status: "done" });
      }
      return next;
    });
  }, []);

  const onNewRun = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setColumns(new Map());
    setHasRun(false);
    setActiveId(null);
    setValue("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const onSelectRun = useCallback(
    (run: HistoryRun) => {
      abortRef.current?.abort();
      setRunning(false);
      setValue(run.request);
      setTask(run.task);
      setSelected(new Set(run.models));
      const map = new Map<ProviderId, ColumnState>();
      for (const c of run.columns) map.set(c.key, c);
      setColumns(map);
      setHasRun(true);
      setActiveId(run.id);
      if (window.innerWidth < 768) setSidebarOpen(false);
    },
    [],
  );

  const onDeleteRun = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistHistory(next);
      return next;
    });
    setActiveId((cur) => (cur === id ? null : cur));
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
    <div className="flex h-full overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        history={history}
        activeId={activeId}
        onClose={() => setSidebarOpen(false)}
        onNewRun={onNewRun}
        onSelect={onSelectRun}
        onDelete={onDeleteRun}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          models={config.models}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
            <ComparisonGrid columns={columnList} hasRun={hasRun} />
          </div>
        </div>

        <div className="border-t border-line bg-bg">
          <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}
