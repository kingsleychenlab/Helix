"use client";

import type { StructureSummary } from "@/lib/types";
import { chainColor } from "@/lib/api";
import { Stat } from "./ui";

const AA_ORDER = [
  "ALA", "ARG", "ASN", "ASP", "CYS", "GLN", "GLU", "GLY", "HIS", "ILE",
  "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL",
];

export default function SummaryPanel({
  summary,
  filename,
  contactCount,
}: {
  summary: StructureSummary;
  filename?: string;
  contactCount?: number;
}) {
  const chainIds = summary.chains.map((c) => c.id);
  const maxComp = Math.max(1, ...Object.values(summary.composition));

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[15px] font-semibold leading-tight">
          {summary.name || "Protein structure"}
        </div>
        <div className="text-[12px] mono text-[var(--faint)] mt-0.5 space-y-0.5">
          {summary.header.idcode && (
            <div>
              PDB {summary.header.idcode.toUpperCase()}
              {summary.header.resolution
                ? ` · ${summary.header.resolution} Å`
                : ""}
            </div>
          )}
          {filename && <div className="truncate">File: {filename}</div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 py-4 border-y border-[var(--line)]">
        <Stat value={summary.n_chains} label="chains" />
        <Stat value={summary.n_residues} label="residues" />
        <Stat value={summary.n_atoms.toLocaleString()} label="atoms" />
      </div>

      <div>
        <div className="panel-title mb-2">Chains</div>
        <div className="space-y-1">
          {summary.chains.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[13px]">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: chainColor(c.id, chainIds) }}
              />
              <span className="mono font-medium">{c.id}</span>
              <span className="text-[var(--muted)]">
                {c.length} residues
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="panel-title mb-2">Amino-acid composition</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {AA_ORDER.filter((aa) => summary.composition[aa] > 0).map((aa) => {
            const n = summary.composition[aa];
            return (
              <div key={aa} className="flex items-center gap-2 text-[12px]">
                <span className="mono w-8 text-[var(--muted)]">{aa}</span>
                <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--aqua)]"
                    style={{
                      width: `${(n / maxComp) * 100}%`,
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span className="mono w-5 text-right text-[var(--muted)]">
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="panel-title mb-2">Geometry check</div>
        {summary.n_missing_backbone === 0 ? (
          <div className="text-[13px] text-[var(--ok)]">
            ✓ No missing backbone atoms detected.
          </div>
        ) : (
          <div className="text-[13px] text-[var(--danger)]">
            {summary.n_missing_backbone} residue(s) with missing backbone atoms:
            <ul className="mt-1 space-y-0.5 max-h-24 overflow-auto scroll-thin">
              {summary.missing_backbone.slice(0, 20).map((m) => (
                <li key={m.index} className="mono text-[12px]">
                  {m.residue} — {m.missing.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}
        {contactCount != null && (
          <div className="text-[12px] text-[var(--faint)] mt-2">
            {contactCount} residue–residue contacts detected.
          </div>
        )}
      </div>
    </div>
  );
}
