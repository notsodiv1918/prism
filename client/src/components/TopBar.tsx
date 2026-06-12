import { Moon, PanelLeft, Sun } from "lucide-react";
import type { ModelInfo } from "../types";
import type { Theme } from "../lib/storage";

interface Props {
  models: ModelInfo[];
  theme: Theme;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
}

export default function TopBar({ models, theme, onToggleTheme, onToggleSidebar }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-bg hover:text-ink"
          title="Toggle history"
        >
          <PanelLeft size={17} />
        </button>
        <span className="hidden text-2xs text-muted sm:block">Multi-model prompt console</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 sm:flex">
          {models.map((m) => (
            <span
              key={m.key}
              title={m.configured ? `${m.label} — ready` : `${m.label} — no key`}
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-2xs font-medium"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: m.configured ? m.color : "transparent",
                  boxShadow: m.configured ? "none" : "inset 0 0 0 1px rgb(var(--line-strong))",
                }}
              />
              {m.label}
            </span>
          ))}
        </div>

        <button
          onClick={onToggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-bg hover:text-ink"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
