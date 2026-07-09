"use client";

import { useRef, useState } from "react";

const ACCEPT = [".pdb", ".ent", ".txt"];

function isAccepted(name: string) {
  return ACCEPT.some((ext) => name.toLowerCase().endsWith(ext));
}

export default function Dropzone({
  onFile,
  busy = false,
  compact = false,
}: {
  onFile: (file: File) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    setLocalError(null);
    const file = files?.[0];
    if (!file) return;
    if (!isAccepted(file.name)) {
      setLocalError(`"${file.name}" isn't a .pdb file.`);
      return;
    }
    onFile(file);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy)
            inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          compact ? "px-4 py-5" : "px-6 py-10"
        } ${
          dragging
            ? "border-[var(--aqua)] bg-[var(--accent-soft)] shadow-[0_0_30px_-8px_var(--glow-aqua)]"
            : "border-[var(--line-strong)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--aqua)]"
        } ${busy ? "opacity-60 pointer-events-none" : ""}`}
      >
        <svg
          width={compact ? 22 : 30}
          height={compact ? 22 : 30}
          viewBox="0 0 24 24"
          fill="none"
          className="mb-2 text-[var(--accent)]"
        >
          <path
            d="M12 15V4m0 0 4 4m-4-4-4 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <div className={`font-medium ${compact ? "text-[13px]" : "text-[15px]"}`}>
          {dragging ? "Drop to load" : "Drag & drop a .pdb file"}
        </div>
        <div className="text-[12px] text-[var(--faint)] mt-1">
          or <span className="text-[var(--accent)]">click to browse</span> ·
          .pdb up to 20 MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdb,.ent,.txt"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {localError && (
        <div className="mt-2 text-[12px] text-[var(--danger)]">{localError}</div>
      )}
    </div>
  );
}
