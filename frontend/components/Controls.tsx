"use client";

import { useRef } from "react";
import type { ViewStyle } from "./Viewer";

export default function Controls({
  onUpload,
  busy,
  hasStructure,
}: {
  onUpload: (file: File) => void;
  busy: boolean;
  hasStructure: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        className={`btn text-[13px] py-1.5 ${hasStructure ? "" : "btn-primary"}`}
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {hasStructure ? "Open another .pdb" : "Upload .pdb"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdb,.ent,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ViewerToolbar({
  style,
  setStyle,
  colorByChain,
  setColorByChain,
}: {
  style: ViewStyle;
  setStyle: (s: ViewStyle) => void;
  colorByChain: boolean;
  setColorByChain: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="seg capitalize">
        {(["cartoon", "stick", "surface"] as ViewStyle[]).map((s) => (
          <button key={s} data-active={style === s} onClick={() => setStyle(s)}>
            {s}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={colorByChain}
          onChange={(e) => setColorByChain(e.target.checked)}
        />
        Color by chain
      </label>
    </div>
  );
}
