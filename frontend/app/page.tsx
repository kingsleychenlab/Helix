"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import HeroViewer from "@/components/HeroViewer";
import SVGBackbone from "@/components/SVGBackbone";

// Public repository — also used by the quickstart snippet below.
const REPO = "https://github.com/kingsleychenlab/Helix";
const CLONE = `git clone ${REPO}\ncd Helix && ./dev.sh`;

const BADGES = [
  "FastAPI",
  "BioPython",
  "NumPy",
  "SciPy",
  "Next.js",
  "3Dmol.js",
];

const METHODS: { title: string; eq: string; note: string }[] = [
  {
    title: "Residue distance",
    eq: "d(i,j) = ‖ CAᵢ − CAⱼ ‖₂",
    note: "Euclidean norm between Cα coordinates; a full N×N matrix by broadcasting.",
  },
  {
    title: "Contact map",
    eq: "C(i,j) = 1  if  d(i,j) ≤ θ",
    note: "Boolean contacts at cutoff θ (default 8 Å); diagonal excluded.",
  },
  {
    title: "Backbone dihedral",
    eq: "φ = atan2( (b₁×v)·w ,  v·w )",
    note: "v, w = b₀, b₂ projected ⊥ to the central bond b₁. Signed, stable.",
  },
];

const CAPABILITIES: { title: string; body: string }[] = [
  {
    title: "3D structure viewer",
    body: "Cartoon, stick, and surface styles with per-chain coloring. Click any residue to inspect it.",
  },
  {
    title: "Distance & contact maps",
    body: "Cα–Cα distance matrix and a contact map at an adjustable cutoff, exportable as CSV.",
  },
  {
    title: "Ramachandran plot",
    body: "Backbone φ/ψ dihedrals from real vector geometry, with allowed-region shading and outlier flags.",
  },
  {
    title: "Secondary structure",
    body: "An explainable helix / sheet / coil estimate derived from backbone geometry.",
  },
  {
    title: "Residue inspector",
    body: "Coordinates, neighbors within 8 Å, φ/ψ angles, and structure state for any residue.",
  },
  {
    title: "Exportable reports",
    body: "One ZIP with the summary, angle tables, contact stats, and rendered plots.",
  },
];

export default function Landing() {
  const reduce = useReducedMotion();

  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.04 } },
  };
  const rise: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18, filter: reduce ? "none" : "blur(6px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(8,10,17,0.85)] backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <HelixMark />
            <span className="font-semibold tracking-tight text-[15px]">Helix</span>
            <span className="chip hidden sm:inline">v1.0.0</span>
            <span className="chip hidden sm:inline">MIT</span>
          </div>
          <nav className="flex items-center gap-1.5 sm:gap-3 text-[13px]">
            <a
              href="#methods"
              className="hidden sm:inline text-[var(--muted)] hover:text-[var(--ink)] transition-colors px-2"
            >
              methods
            </a>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="btn text-[13px] py-1.5"
            >
              <GitHubMark /> GitHub
            </a>
            <Link href="/dashboard" className="btn btn-primary text-[13px] py-1.5">
              Launch app →
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl w-full px-6 pt-16 pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p variants={rise} className="eyebrow">
            Open source · protein structure toolkit
          </motion.p>
          <motion.h1
            variants={rise}
            className="mt-5 text-[62px] leading-[0.95] font-semibold tracking-[-0.04em]"
          >
            Helix
          </motion.h1>
          <motion.p
            variants={rise}
            className="mt-3 text-[23px] leading-tight tracking-tight text-[var(--muted)]"
          >
            Protein structure,{" "}
            <span className="grad-ink font-medium">made simple.</span>
          </motion.p>
          <motion.p
            variants={rise}
            className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--muted)]"
          >
            A small, readable tool that parses a PDB file, renders it in 3D, and
            computes real structural analysis — distance and contact maps,
            Ramachandran plots, backbone geometry — with a tested Python core and
            a TypeScript UI. Runs entirely on your machine.
          </motion.p>

          <motion.div variants={rise} className="mt-7">
            <Terminal />
          </motion.div>

          <motion.div variants={rise} className="mt-6 flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="btn btn-primary text-[15px] px-5 py-2.5"
            >
              Launch app →
            </Link>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="btn text-[15px] px-5 py-2.5"
            >
              <GitHubMark /> View source
            </a>
          </motion.div>

          <motion.div
            variants={rise}
            className="mt-6 flex flex-wrap gap-1.5 text-[11px]"
          >
            {BADGES.map((b) => (
              <span key={b} className="chip">
                {b}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Live molecule */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative aspect-square w-full max-w-[460px] mx-auto"
        >
          <div
            className="absolute -inset-3 rounded-[28px] opacity-55 blur-2xl"
            style={{
              background:
                "conic-gradient(from 120deg, var(--glow-aqua), var(--glow-violet), var(--glow-aqua))",
            }}
          />
          <div className="relative h-full rounded-2xl border border-[var(--line-strong)] bg-[#0b0e18] overflow-hidden float-slow">
            <HeroViewer />
            <div className="absolute left-4 bottom-3 flex items-center gap-2 text-[11px] mono text-[var(--faint)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--aqua)] shadow-[0_0_8px_var(--glow-aqua)]" />
              Ubiquitin · 1UBQ · live
            </div>
          </div>
        </motion.div>
      </section>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mx-auto max-w-6xl w-full px-6 -mt-4 hidden lg:flex items-center gap-2 text-[12px] mono text-[var(--faint)]"
      >
        <motion.span
          aria-hidden
          animate={reduce ? undefined : { y: 5 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.85,
            ease: "easeInOut",
          }}
        >
          ↓
        </motion.span>
        scroll to watch it draw
      </motion.div>

      {/* Animated scroll-drawn backbone journey */}
      <SVGBackbone />

      {/* Methods — the math, in the open */}
      <section
        id="methods"
        className="border-t border-[var(--line)] bg-[var(--bg-2)]"
      >
        <div className="mx-auto max-w-6xl w-full px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="panel-title">Methods</p>
            <h2 className="mt-3 text-[26px] font-semibold tracking-tight">
              The math, in the open.
            </h2>
            <p className="mt-2 text-[14px] text-[var(--muted)] max-w-xl">
              No black boxes. Every number comes from geometry you can read in the
              source — and check against the test suite.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {METHODS.map((m) => (
              <motion.div key={m.title} variants={rise} className="panel p-5 lift">
                <div className="panel-title">{m.title}</div>
                <div className="mt-3 rounded-lg border border-[var(--line)] bg-[#0b0e18] px-3 py-3 mono text-[14px] text-[var(--aqua)] overflow-x-auto">
                  {m.eq}
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted)]">
                  {m.note}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl w-full px-6 py-20">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="panel-title mb-6"
        >
          Capabilities
        </motion.p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {CAPABILITIES.map((f) => (
            <motion.div key={f.title} variants={rise} className="panel p-5 lift group">
              <div className="w-7 h-7 rounded-md mb-3 flex items-center justify-center border border-[var(--line)] group-hover:border-[var(--aqua)] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--aqua)] group-hover:shadow-[0_0_10px_var(--glow-aqua)] transition-shadow" />
              </div>
              <h3 className="text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                {f.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <footer className="mt-auto border-t border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-[12px] text-[var(--faint)]">
          <div className="flex items-center gap-2">
            <HelixMark />
            <span>Helix · MIT License</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--ink)] transition-colors"
            >
              GitHub ↗
            </a>
            <span>Python · FastAPI · BioPython</span>
            <span>Next.js · TypeScript · 3Dmol.js</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Terminal() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CLONE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[#0a0d16] overflow-hidden max-w-lg">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--line)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[11px] mono text-[var(--faint)]">quickstart</span>
        </div>
        <button
          onClick={copy}
          className="text-[11px] mono text-[var(--muted)] hover:text-[var(--aqua)] transition-colors"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="px-4 py-3.5 text-[13px] mono leading-relaxed overflow-x-auto">
        <code>
          <span className="text-[var(--aqua)]">$</span>{" "}
          <span className="text-[var(--ink)]">git clone {REPO}</span>
          {"\n"}
          <span className="text-[var(--aqua)]">$</span>{" "}
          <span className="text-[var(--ink)]">cd helix && ./dev.sh</span>
          {"\n"}
          <span className="text-[var(--faint)]">→ backend :8000 · frontend :3000</span>
          <span className="cursor-blink text-[var(--aqua)]">▍</span>
        </code>
      </pre>
    </div>
  );
}

function HelixMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3c0 4 12 5 12 9S6 17 6 21"
        stroke="var(--aqua)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 3c0 4-12 5-12 9s12 5 12 9"
        stroke="var(--violet)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 7h8M8 17h8"
        stroke="var(--faint)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
