import { Plus, Trash2, X } from "lucide-react";
import type { HistoryRun } from "../lib/storage";

function PrismMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path d="M13 3 L23 21 L3 21 Z" stroke="rgb(var(--ink))" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 21 L13 12" stroke="#10A37F" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 12 L23 21" stroke="#CC785C" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 12 L13 21" stroke="#4285F4" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  open: boolean;
  history: HistoryRun[];
  activeId: string | null;
  onClose: () => void;
  onNewRun: () => void;
  onSelect: (run: HistoryRun) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  open,
  history,
  activeId,
  onClose,
  onNewRun,
  onSelect,
  onDelete,
}: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-30 w-[264px] flex-col border-r border-line bg-surface md:relative md:z-0`}
      >
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <PrismMark />
            <span className="font-display text-[15px] font-bold tracking-tight">Prism</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-ink md:hidden"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={onNewRun}
            className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-bg"
          >
            <Plus size={15} />
            New run
          </button>
        </div>

        <div className="mt-4 px-4 text-2xs font-medium uppercase tracking-wide text-faint">
          History
        </div>

        <div className="mt-1.5 flex-1 overflow-y-auto px-2 pb-3 scroll-thin">
          {history.length === 0 ? (
            <p className="px-2 py-3 text-[12.5px] leading-relaxed text-faint">
              Your past runs will appear here.
            </p>
          ) : (
            history.map((run) => (
              <div
                key={run.id}
                className={`group relative mb-0.5 rounded-lg ${
                  run.id === activeId ? "bg-bg" : "hover:bg-bg"
                }`}
              >
                <button
                  onClick={() => onSelect(run)}
                  className="block w-full px-2.5 py-2 pr-8 text-left"
                >
                  <div className="truncate text-[13px] text-ink">{run.request}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-faint">
                    <span className="capitalize">{run.task}</span>
                    <span>·</span>
                    <span>{timeAgo(run.ts)}</span>
                  </div>
                </button>
                <button
                  onClick={() => onDelete(run.id)}
                  className="absolute right-1.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-faint hover:bg-line hover:text-danger group-hover:flex"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
