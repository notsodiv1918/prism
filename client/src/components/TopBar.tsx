import type { ModelInfo } from "../types";

function PrismMark() {
  // A literal prism: one ray entering, three diverging — the product in a glyph.
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path d="M13 3 L23 21 L3 21 Z" stroke="#16161A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 21 L13 12" stroke="#10A37F" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 12 L23 21" stroke="#CC785C" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 12 L13 21" stroke="#4285F4" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function TopBar({ models }: { models: ModelInfo[] }) {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3 sm:px-7">
        <div className="flex items-center gap-2.5">
          <PrismMark />
          <div className="leading-none">
            <div className="font-display text-[17px] font-bold tracking-tight">Prism</div>
            <div className="mt-0.5 hidden text-2xs text-muted sm:block">
              Multi-model prompt console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {models.map((m) => (
            <span
              key={m.key}
              title={
                m.configured
                  ? `${m.label} — key configured`
                  : `${m.label} — no API key set`
              }
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-2xs font-medium"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: m.configured ? m.color : "transparent",
                  boxShadow: m.configured ? "none" : "inset 0 0 0 1px #C9C8C2",
                }}
              />
              <span className="hidden sm:inline">{m.label}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
