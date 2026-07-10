"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent, useReducedMotion } from "framer-motion";

/**
 * Scroll-drawn double-helix journey.
 *
 * A proper 3D-looking double helix: two intertwining strands plus base-pair
 * rungs, shaded by depth (painter's algorithm — front segments are thicker and
 * brighter, rungs foreshorten to nothing where the strands cross). It "draws"
 * on scroll via a growing clip-path (one attribute write per frame) with a
 * glowing playhead riding the leading edge, so it stays at 60fps — no WebGL,
 * no per-frame React renders.
 */

const VW = 460;
const VH = 780;
const TOP = 60;
const BOT = 720;
const CX = 230;
const AMP = 124;
const TURNS = 3;
const N = 168;
const RUNG_EVERY = 7;

type Seg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  o: number;
  z: number;
  rung: boolean;
  stroke: string;
};

const STRAND_A_COLOR = "#34e5d4"; // aqua
const STRAND_B_COLOR = "#9a7bff"; // violet
const RUNG_COLOR = "#f6c453"; // gold base pairs

function buildHelix(): { segs: Seg[]; strand: { x: number; y: number }[] } {
  const A: { x: number; y: number; d: number }[] = [];
  const B: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const y = TOP + (BOT - TOP) * f;
    const ph = f * Math.PI * 2 * TURNS;
    A.push({ x: CX + AMP * Math.sin(ph), y, d: Math.cos(ph) });
    B.push({ x: CX - AMP * Math.sin(ph), y, d: -Math.cos(ph) });
  }

  // Both strands stay clearly visible (so it reads as a DOUBLE helix); the
  // front one is just brighter + thicker than the back for depth.
  const style = (d: number) => {
    const nd = (d + 1) / 2; // 0 = back, 1 = front
    return { w: 3.4 + 3.2 * nd, o: 0.5 + 0.5 * nd };
  };

  const segs: Seg[] = [];
  for (let i = 0; i < N; i++) {
    const dA = (A[i].d + A[i + 1].d) / 2;
    const sA = style(dA);
    segs.push({ x1: A[i].x, y1: A[i].y, x2: A[i + 1].x, y2: A[i + 1].y, w: sA.w, o: sA.o, z: dA, rung: false, stroke: STRAND_A_COLOR });
    const dB = (B[i].d + B[i + 1].d) / 2;
    const sB = style(dB);
    segs.push({ x1: B[i].x, y1: B[i].y, x2: B[i + 1].x, y2: B[i + 1].y, w: sB.w, o: sB.o, z: dB, rung: false, stroke: STRAND_B_COLOR });
  }
  // Sparse base-pair rungs — skip the near-crossing ones (too short to read).
  for (let i = RUNG_EVERY; i < N; i += RUNG_EVERY) {
    const f = i / N;
    const ph = f * Math.PI * 2 * TURNS;
    const face = Math.abs(Math.sin(ph));
    if (face < 0.3) continue;
    segs.push({ x1: A[i].x, y1: A[i].y, x2: B[i].x, y2: B[i].y, w: 1.5, o: 0.15 + 0.3 * face, z: -0.05, rung: true, stroke: RUNG_COLOR });
  }
  // Painter's algorithm: draw back-to-front.
  segs.sort((p, q) => p.z - q.z);
  return { segs, strand: A.map((p) => ({ x: p.x, y: p.y })) };
}

const { segs: HELIX, strand: STRAND } = buildHelix();

const STAGES = [
  {
    eyebrow: "01 · Parse",
    title: "Read the whole chain.",
    body: "Atoms, chains and backbone — parsed straight from the PDB with BioPython.",
  },
  {
    eyebrow: "02 · Measure",
    title: "Turn geometry into numbers.",
    body: "Cα–Cα distances and φ/ψ backbone dihedrals, computed with real vector math.",
  },
  {
    eyebrow: "03 · Explore",
    title: "See all of it at once.",
    body: "3D view, contact map, Ramachandran plot and secondary structure — then export.",
  },
];

export default function SVGBackbone() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<SVGRectElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const haloRef = useRef<SVGCircleElement>(null);
  const [prog, setProg] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const placeDot = (x: number, y: number, op: number) => {
    for (const el of [dotRef.current, haloRef.current]) {
      if (!el) continue;
      el.setAttribute("cx", `${x}`);
      el.setAttribute("cy", `${y}`);
      el.setAttribute("opacity", `${op}`);
    }
  };

  // Reveal edge maps p∈[0,1] → y. At p=0 it sits ABOVE the helix so nothing
  // colored (and no playhead) shows until you actually scroll.
  const revealY = (p: number) => TOP - 12 + (BOT - TOP + 12) * p;

  useEffect(() => {
    if (reduce) {
      revealRef.current?.setAttribute("height", `${VH}`);
      const last = STRAND[STRAND.length - 1];
      placeDot(last.x, last.y, 1);
    } else {
      revealRef.current?.setAttribute("height", `${revealY(0)}`);
      placeDot(STRAND[0].x, STRAND[0].y, 0);
    }
  }, [reduce]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduce) return;
    revealRef.current?.setAttribute("height", `${revealY(p)}`);
    const idx = Math.min(STRAND.length - 1, Math.max(0, Math.round(p * (STRAND.length - 1))));
    placeDot(STRAND[idx].x, STRAND[idx].y, Math.min(1, p * 40));
    if (Math.abs(p - prog) > 0.006) setProg(p);
  });

  // Reduced motion: full helix + stacked captions.
  if (reduce) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">The pipeline</p>
        <div className="mt-6 grid sm:grid-cols-3 gap-8">
          {STAGES.map((s) => (
            <div key={s.title}>
              <p className="text-[11px] mono text-[var(--aqua)]">{s.eyebrow}</p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-[14px] text-[var(--muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const active = Math.min(STAGES.length - 1, Math.floor(prog * STAGES.length));

  return (
    <section
      ref={sectionRef}
      style={{ height: `${STAGES.length * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
        <div className="relative mx-auto max-w-6xl w-full px-6 grid lg:grid-cols-2 items-center gap-8">
          {/* Captions */}
          <div className="relative h-[220px] order-2 lg:order-1">
            {STAGES.map((s, i) => {
              const on = i === active;
              return (
                <div
                  key={s.title}
                  className="absolute inset-x-0 top-1/2"
                  style={{
                    opacity: on ? 1 : 0,
                    transform: `translateY(calc(-50% + ${(i - active) * 24}px))`,
                    transition:
                      "opacity 0.5s var(--ease), transform 0.5s var(--ease)",
                    pointerEvents: on ? "auto" : "none",
                  }}
                >
                  <p className="eyebrow">{s.eyebrow}</p>
                  <h2 className="mt-4 text-[40px] leading-[1.03] font-semibold tracking-[-0.03em]">
                    {s.title}
                  </h2>
                  <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)] max-w-md">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Double helix */}
          <div className="order-1 lg:order-2 flex justify-center">
            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              className="w-auto h-[78vh] max-h-[700px] overflow-visible"
              aria-hidden
            >
              <defs>
                <filter id="hxGlow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <clipPath id="hxReveal">
                  <rect ref={revealRef} x="0" y="0" width={VW} height={TOP - 12} />
                </clipPath>
              </defs>

              {/* faint full track (both strands ghosted) */}
              <g opacity="0.10">
                {HELIX.filter((s) => !s.rung).map((s, i) => (
                  <line
                    key={`t${i}`}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#ffffff"
                    strokeWidth={s.w * 0.7}
                    strokeLinecap="round"
                  />
                ))}
              </g>

              {/* revealed helix (draws top → bottom on scroll) */}
              <g clipPath="url(#hxReveal)">
                {HELIX.map((s, i) => (
                  <line
                    key={i}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={s.stroke}
                    strokeWidth={s.w}
                    strokeLinecap="round"
                    opacity={s.o}
                  />
                ))}
              </g>

              {/* traveling playhead at the leading edge (hidden until scroll) */}
              <circle
                ref={haloRef}
                cx={STRAND[0].x}
                cy={STRAND[0].y}
                r="17"
                fill="rgba(52,229,212,0.22)"
                opacity="0"
              />
              <circle
                ref={dotRef}
                cx={STRAND[0].x}
                cy={STRAND[0].y}
                r="6.5"
                fill="#ffffff"
                filter="url(#hxGlow)"
                opacity="0"
              />
            </svg>
          </div>
        </div>

        {/* progress rail */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center">
          <div
            className="relative w-[2px] rounded-full bg-[rgba(255,255,255,0.1)]"
            style={{ height: 300 }}
          >
            <div
              className="absolute left-0 top-0 w-[2px] rounded-full"
              style={{
                height: `${prog * 100}%`,
                background: "linear-gradient(180deg, var(--aqua), var(--violet))",
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 -mt-1.5"
              style={{ top: `${prog * 300}px` }}
            >
              <span className="block w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_var(--glow-aqua)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
