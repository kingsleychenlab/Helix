"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={`panel flex flex-col ${className}`}
    >
      {title && (
        <div className="panel-head">
          <span className="panel-title">{title}</span>
          {actions}
        </div>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </motion.section>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="text-[26px] leading-none font-semibold tracking-tight mono text-[var(--ink)]">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)] mt-2">
        {label}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-8 text-[13px] text-[var(--muted)]">
      <span
        className="inline-block w-4 h-4 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, transparent, var(--aqua))",
          maskImage: "radial-gradient(closest-side, transparent 62%, #000 64%)",
          WebkitMaskImage:
            "radial-gradient(closest-side, transparent 62%, #000 64%)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {label ?? "Loading…"}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="text-[13px] text-[var(--danger)] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.25)] rounded-lg px-3.5 py-2.5">
      {message}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="py-8 text-center text-[13px] text-[var(--faint)]">
      {children}
    </div>
  );
}
