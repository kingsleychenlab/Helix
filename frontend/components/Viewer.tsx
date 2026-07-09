"use client";

import { useEffect, useRef, useState } from "react";
import { chainColor } from "@/lib/api";

export type ViewStyle = "cartoon" | "stick" | "surface";

export interface ClickedResidue {
  chain: string;
  seq: number;
}

interface ViewerProps {
  pdbText: string | null;
  style: ViewStyle;
  colorByChain: boolean;
  chainIds: string[];
  selected: { chain: string; seq: number } | null;
  onPick: (r: ClickedResidue) => void;
}

// 3Dmol has no types shipped; keep a narrow local shape.
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function Viewer({
  pdbText,
  style,
  colorByChain,
  chainIds,
  selected,
  onPick,
}: ViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const molRef = useRef<any>(null);
  const $3Dmol = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the 3Dmol viewer once, client-side only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("3dmol/build/3Dmol.js");
        // UMD/ESM interop: the library may be the namespace or its default.
        const lib = (mod as any).default ?? mod;
        if (cancelled || !hostRef.current) return;
        $3Dmol.current = lib;
        viewerRef.current = lib.createViewer(hostRef.current, {
          backgroundColor: "black",
          backgroundAlpha: 0,
          antialias: true,
        });
        setReady(true);
      } catch {
        setError("Could not load the 3D viewer library.");
      }
    })();
    return () => {
      cancelled = true;
      try {
        viewerRef.current?.clear();
      } catch {
        /* noop */
      }
    };
  }, []);

  // Keep the WebGL canvas sized to its container as the layout changes.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      try {
        viewerRef.current?.resize();
        viewerRef.current?.render();
      } catch {
        /* viewer not ready yet */
      }
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [ready]);

  // Tracks the currently-highlighted residue so we can clear it precisely.
  const prevSelRef = useRef<{ chain: string; seq: number } | null>(null);

  // Load / replace the model when coordinates change.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!ready || !viewer || !pdbText) return;
    viewer.removeAllModels();
    viewer.removeAllSurfaces();
    molRef.current = viewer.addModel(pdbText, "pdb");

    // Click handling: report the picked residue (chain + author seq).
    molRef.current.setClickable({}, true, (atom: any) => {
      if (atom) onPick({ chain: atom.chain || "A", seq: atom.resi });
    });

    applyBase();
    highlight(selected);
    prevSelRef.current = selected;
    viewer.zoomTo();
    viewer.zoom(1.25); // tighter framing so the structure fills the panel
    viewer.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pdbText]);

  // Rebuild the base representation (and re-apply the current highlight) when
  // the style or coloring changes. Rebuilding from scratch guarantees the old
  // highlight geometry is cleared instead of lingering across styles.
  useEffect(() => {
    if (!ready || !molRef.current) return;
    applyBase();
    highlight(selected);
    prevSelRef.current = selected;
    viewerRef.current.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, colorByChain, chainIds.join("")]);

  // Swap the highlighted residue without rebuilding the scene (so a surface
  // isn't recomputed on every click).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!ready || !viewer || !molRef.current) return;
    unhighlight(prevSelRef.current);
    highlight(selected);
    prevSelRef.current = selected;
    viewer.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function baseStyleObj(chain: string) {
    const color = colorByChain ? chainColor(chain, chainIds) : "#7aa2ff";
    if (style === "stick") return { stick: { color, radius: 0.15 } };
    return { cartoon: { color } }; // cartoon + surface both use a cartoon base
  }

  function applyBase() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setStyle({}, {});
    viewer.removeAllSurfaces();
    for (const c of chainIds) viewer.setStyle({ chain: c }, baseStyleObj(c));
    if (style === "cartoon") {
      // Show ligands/hetero as sticks so they aren't invisible.
      viewer.addStyle({ hetflag: true }, { stick: { radius: 0.15 } });
    }
    if (style === "surface") {
      try {
        viewer.addSurface($3Dmol.current.SurfaceType.VDW, {
          opacity: 0.72,
          color: "#3a4a6a",
        });
      } catch {
        /* surface can fail on odd inputs; cartoon still shows */
      }
    }
  }

  function highlight(sel: { chain: string; seq: number } | null) {
    const viewer = viewerRef.current;
    if (!viewer || !sel) return;
    const gold = "#f6c453";
    const sele = { chain: sel.chain, resi: sel.seq };
    if (style === "surface") {
      // Sticks hide under the surface — mark it with a sphere that pokes out.
      viewer.addStyle(sele, { sphere: { color: gold, radius: 0.9 } });
    } else {
      viewer.addStyle(sele, { stick: { color: gold, radius: 0.3 } });
      viewer.addStyle(sele, { sphere: { color: gold, radius: 0.5 } });
    }
  }

  function unhighlight(sel: { chain: string; seq: number } | null) {
    const viewer = viewerRef.current;
    if (!viewer || !sel) return;
    // Reset just that residue to the base representation (drops the gold).
    viewer.setStyle({ chain: sel.chain, resi: sel.seq }, baseStyleObj(sel.chain));
  }

  return (
    <div className="relative w-full h-full min-h-[420px]">
      <div ref={hostRef} className="absolute inset-0 rounded-[9px] overflow-hidden" />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--muted)]">
          Initializing viewer…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--danger)]">
          {error}
        </div>
      )}
      {ready && !pdbText && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--faint)]">
          Load a structure to begin.
        </div>
      )}
    </div>
  );
}
