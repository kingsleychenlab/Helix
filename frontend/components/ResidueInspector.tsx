"use client";

import type { ResidueDetail } from "@/lib/types";
import { SS_COLORS } from "@/lib/api";
import { Empty, Spinner } from "./ui";

export default function ResidueInspector({
  detail,
  loading,
  onSelectNeighbor,
}: {
  detail: ResidueDetail | null;
  loading: boolean;
  onSelectNeighbor?: (index: number) => void;
}) {
  if (loading) return <Spinner label="Loading residue…" />;
  if (!detail)
    return (
      <Empty>
        Click a residue in the 3D viewer, plot, or track to inspect it.
      </Empty>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[17px] font-semibold mono">
            {detail.name}
            <span className="text-[var(--muted)] font-normal">
              {" "}
              {detail.seq}
              {detail.icode}
            </span>
          </div>
          <div className="text-[12px] text-[var(--faint)]">
            Chain {detail.chain} · index {detail.index}
            {!detail.is_amino && " · hetero"}
          </div>
        </div>
        <span
          className="chip"
          style={{
            color: SS_COLORS[detail.ss],
            borderColor: SS_COLORS[detail.ss],
          }}
        >
          {detail.ss}
        </span>
      </div>

      <Row label="Cα coordinate">
        {detail.coord
          ? `(${detail.coord.map((c) => c.toFixed(1)).join(", ")})`
          : "—"}
      </Row>
      <Row label="φ / ψ">
        {detail.phi != null ? `${detail.phi}°` : "—"} /{" "}
        {detail.psi != null ? `${detail.psi}°` : "—"}
      </Row>
      <Row label="Atoms">{detail.atoms.length} — {detail.atoms.join(" ")}</Row>
      <Row label="Contacts ≤8 Å">{detail.neighbors.length}</Row>
      {detail.missing_backbone.length > 0 && (
        <Row label="Missing">
          <span className="text-[var(--danger)]">
            {detail.missing_backbone.join(", ")}
          </span>
        </Row>
      )}

      <div>
        <div className="panel-title mb-1.5">Neighbors within 8 Å</div>
        {detail.neighbors.length === 0 ? (
          <div className="text-[12px] text-[var(--faint)]">None.</div>
        ) : (
          <div className="max-h-40 overflow-auto scroll-thin space-y-0.5">
            {detail.neighbors.map((nb) => (
              <button
                key={nb.index}
                onClick={() => onSelectNeighbor?.(nb.index)}
                className="w-full flex items-center justify-between text-[12px] px-2 py-1 rounded-md hover:bg-[rgba(255,255,255,0.06)]"
              >
                <span className="mono">{nb.label}</span>
                <span className="mono text-[var(--muted)]">
                  {nb.distance.toFixed(1)} Å
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 text-[13px]">
      <span className="panel-title w-28 shrink-0">{label}</span>
      <span className="mono text-[var(--text)] break-all">{children}</span>
    </div>
  );
}
