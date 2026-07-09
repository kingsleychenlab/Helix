"use client";

import type { SecondaryData } from "@/lib/types";
import { SS_COLORS } from "@/lib/api";

export default function SecondaryStructure({
  data,
  onSelect,
  selectedIndex,
}: {
  data: SecondaryData;
  onSelect?: (index: number) => void;
  selectedIndex?: number | null;
}) {
  const total = data.per_residue.length || 1;
  const frac = data.fractions;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-[12px]">
        {(["helix", "sheet", "coil"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: SS_COLORS[k] }}
            />
            <span className="capitalize text-[var(--muted)]">{k}</span>
            <span className="mono font-medium">
              {Math.round(frac[k] * 100)}%
            </span>
          </span>
        ))}
      </div>

      {/* Per-residue track */}
      <div className="flex w-full h-6 rounded-md overflow-hidden border border-[var(--border)]">
        {data.per_residue.map((r) => (
          <button
            key={r.index}
            title={`${r.label} · ${r.ss}`}
            onClick={() => onSelect?.(r.index)}
            className="h-full transition-opacity hover:opacity-70"
            style={{
              flex: `1 1 ${100 / total}%`,
              minWidth: 0,
              background: SS_COLORS[r.ss],
              outline:
                selectedIndex === r.index ? "2px solid #f2b705" : "none",
              outlineOffset: "-2px",
            }}
          />
        ))}
      </div>

      <p className="mt-2 text-[11px] text-[var(--faint)] leading-relaxed">
        {data.method}. {data.note}
      </p>
    </div>
  );
}
