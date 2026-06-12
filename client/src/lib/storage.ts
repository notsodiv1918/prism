import type { ColumnState, ProviderId, TaskType } from "../types";

const THEME_KEY = "prism.theme";
const HISTORY_KEY = "prism.history";
const MAX_HISTORY = 50;

export type Theme = "light" | "dark";

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export interface HistoryRun {
  id: string;
  ts: number;
  task: TaskType;
  request: string;
  models: ProviderId[];
  columns: ColumnState[];
}

export function loadHistory(): HistoryRun[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryRun[]) : [];
  } catch {
    return [];
  }
}

export function persistHistory(runs: HistoryRun[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(runs.slice(0, MAX_HISTORY)));
  } catch {
    /* quota or disabled — non-fatal */
  }
}
