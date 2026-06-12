import { Columns3 } from "lucide-react";
import type { ColumnState } from "../types";
import ModelColumn from "./ModelColumn";

interface Props {
  columns: ColumnState[];
  hasRun: boolean;
}

export default function ComparisonGrid({ columns, hasRun }: Props) {
  if (!hasRun) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md px-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface">
            <Columns3 size={20} className="text-faint" strokeWidth={1.6} />
          </div>
          <h2 className="font-display text-[18px] font-semibold">One prompt, every model</h2>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
            Pick a task, choose your models, and write a request. Prism tailors the
            prompt to each model, streams the answers side by side, and measures
            latency, cost, and quality as they arrive.
          </p>
        </div>
      </div>
    );
  }

  const cols = columns.length;
  const gridCols =
    cols >= 3 ? "lg:grid-cols-3" : cols === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

  return (
    <div className={`grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 ${gridCols}`}>
      {columns.map((c) => (
        <ModelColumn key={c.key} state={c} />
      ))}
    </div>
  );
}
