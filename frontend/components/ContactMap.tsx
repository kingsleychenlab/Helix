"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContactData } from "@/lib/types";

type Mode = "distance" | "contact";

// Viridis-ish stops (dark -> bright) for the distance heatmap.
const VIRIDIS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

function viridis(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (VIRIDIS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[Math.min(i + 1, VIRIDIS.length - 1)];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

export default function ContactMap({
  data,
  onHoverPair,
}: {
  data: ContactData;
  onHoverPair?: (i: number, j: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("distance");
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);

  const n = data.labels.length;
  const maxDist = useMemo(() => {
    let m = 0;
    for (const row of data.distance_matrix)
      for (const v of row) if (v != null && v > m) m = v;
    return m || 1;
  }, [data]);

  const cell = Math.max(2, Math.floor(360 / Math.max(n, 1)));
  const size = n * cell;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (mode === "contact") {
          if (data.contact_matrix[i][j]) {
            ctx.fillStyle = "#34e5d4";
            ctx.fillRect(j * cell, i * cell, cell, cell);
          }
        } else {
          const d = data.distance_matrix[i][j];
          if (d == null) {
            ctx.fillStyle = "rgba(255,255,255,0.05)";
          } else {
            // Invert so short distances (contacts) are bright.
            ctx.fillStyle = viridis(1 - d / maxDist);
          }
          ctx.fillRect(j * cell, i * cell, cell, cell);
        }
      }
    }
  }, [data, mode, n, cell, size, maxDist]);

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const j = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    const i = Math.floor(((e.clientY - rect.top) / rect.height) * n);
    if (i >= 0 && j >= 0 && i < n && j < n) {
      setHover({ i, j });
      onHoverPair?.(i, j);
    }
  }

  const hoverInfo =
    hover &&
    (() => {
      const d = data.distance_matrix[hover.i][hover.j];
      return `${data.labels[hover.i]} · ${data.labels[hover.j]} — ${
        d == null ? "n/a" : `${d.toFixed(1)} Å`
      }${data.contact_matrix[hover.i][hover.j] ? " · contact" : ""}`;
    })();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="seg">
          {(["distance", "contact"] as Mode[]).map((m) => (
            <button key={m} data-active={mode === m} onClick={() => setMode(m)}>
              {m === "distance" ? "Distance" : "Contacts"}
            </button>
          ))}
        </div>
        <span className="text-[11px] mono text-[var(--faint)]">
          {n}×{n} · {data.n_contacts} contacts ≤ {data.cutoff}Å
        </span>
      </div>

      <div className="flex justify-center bg-[rgba(0,0,0,0.28)] border border-[var(--line)] rounded-lg p-2">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          style={{
            width: "min(100%, 360px)",
            height: "auto",
            imageRendering: "pixelated",
            aspectRatio: "1 / 1",
            cursor: "crosshair",
            borderRadius: "6px",
          }}
        />
      </div>

      <div className="mt-2 h-4 text-[11px] mono text-[var(--muted)] text-center">
        {hoverInfo ?? "Hover the map to inspect a residue pair"}
      </div>

      {mode === "distance" && (
        <div className="mt-1 flex items-center gap-2 justify-center text-[10px] text-[var(--faint)]">
          <span>far</span>
          <div
            className="h-2 w-32 rounded"
            style={{
              background: `linear-gradient(90deg, ${viridis(0)}, ${viridis(
                0.5
              )}, ${viridis(1)})`,
            }}
          />
          <span>close</span>
        </div>
      )}
    </div>
  );
}
