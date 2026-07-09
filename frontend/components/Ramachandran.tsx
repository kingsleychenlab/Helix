"use client";

import { useState } from "react";
import type { RamachandranData, RamaRow } from "@/lib/types";
import { chainColor } from "@/lib/api";

const SIZE = 300;
const PAD = 34;

// Map an angle in [-180, 180] to a pixel coordinate.
function sx(phi: number) {
  return PAD + ((phi + 180) / 360) * (SIZE - PAD - 8);
}
function sy(psi: number) {
  return SIZE - PAD - ((psi + 180) / 360) * (SIZE - PAD - 8);
}

type ColorMode = "region" | "chain";

export default function Ramachandran({
  data,
  chainIds,
  onSelect,
}: {
  data: RamachandranData;
  chainIds: string[];
  onSelect?: (row: RamaRow) => void;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>("region");
  const [hover, setHover] = useState<RamaRow | null>(null);

  const points = data.rows.filter((r) => r.phi != null && r.psi != null);

  const regionColor: Record<string, string> = {
    alpha: "#8a7cff",
    beta: "#34e5d4",
    left_alpha: "#f6c453",
    other: "#6b7488",
    undefined: "#414a63",
  };

  const pointColor = (r: RamaRow) =>
    colorMode === "chain"
      ? chainColor(r.chain, chainIds)
      : regionColor[r.region] ?? "#98a2b3";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="seg">
          {(["region", "chain"] as ColorMode[]).map((m) => (
            <button
              key={m}
              data-active={colorMode === m}
              onClick={() => setColorMode(m)}
            >
              {m === "region" ? "By region" : "By chain"}
            </button>
          ))}
        </div>
        <span className="text-[11px] mono text-[var(--faint)]">
          {data.n_defined} pts · {data.n_outliers} outliers
        </span>
      </div>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[320px]"
          style={{ touchAction: "none" }}
        >
          {/* allowed-region shading */}
          <rect
            x={sx(-160)}
            y={sy(30)}
            width={sx(-20) - sx(-160)}
            height={sy(-90) - sy(30)}
            fill="#8a7cff"
            opacity={0.16}
          />
          <rect
            x={sx(-180)}
            y={sy(180)}
            width={sx(-40) - sx(-180)}
            height={sy(90) - sy(180)}
            fill="#34e5d4"
            opacity={0.14}
          />

          {/* axes */}
          <line x1={PAD} y1={sy(0)} x2={SIZE - 8} y2={sy(0)} stroke="rgba(255,255,255,0.12)" />
          <line x1={sx(0)} y1={8} x2={sx(0)} y2={SIZE - PAD} stroke="rgba(255,255,255,0.12)" />
          <rect
            x={PAD}
            y={8}
            width={SIZE - PAD - 8}
            height={SIZE - PAD - 8}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
          />

          {/* ticks */}
          {[-180, -90, 0, 90, 180].map((t) => (
            <g key={`x${t}`}>
              <text
                x={sx(t)}
                y={SIZE - PAD + 14}
                fontSize="8"
                textAnchor="middle"
                fill="#6b7488"
              >
                {t}
              </text>
              <text
                x={PAD - 6}
                y={sy(t) + 3}
                fontSize="8"
                textAnchor="end"
                fill="#6b7488"
              >
                {t}
              </text>
            </g>
          ))}
          <text
            x={(SIZE + PAD) / 2}
            y={SIZE - 2}
            fontSize="9"
            textAnchor="middle"
            fill="#97a1bd"
          >
            φ (phi)
          </text>
          <text
            x={10}
            y={(SIZE - PAD) / 2}
            fontSize="9"
            textAnchor="middle"
            fill="#97a1bd"
            transform={`rotate(-90 10 ${(SIZE - PAD) / 2})`}
          >
            ψ (psi)
          </text>

          {/* points */}
          {points.map((r) => (
            <circle
              key={r.index}
              cx={sx(r.phi as number)}
              cy={sy(r.psi as number)}
              r={hover?.index === r.index ? 4 : 2.4}
              fill={pointColor(r)}
              stroke={r.outlier ? "#ff6b6b" : "none"}
              strokeWidth={r.outlier ? 1.4 : 0}
              opacity={0.9}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(r)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(r)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-1 h-4 text-[11px] mono text-center text-[var(--muted)]">
        {hover
          ? `${hover.label} — φ ${hover.phi}° ψ ${hover.psi}° · ${hover.region}${
              hover.outlier ? " · outlier" : ""
            }`
          : "Hover or click a point"}
      </div>

      {colorMode === "region" && (
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[var(--muted)]">
          {[
            ["alpha", "α-helix"],
            ["beta", "β-sheet"],
            ["left_alpha", "L-α"],
            ["other", "other"],
          ].map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: regionColor[k] }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
