"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Landing hero: a live, slowly auto-rotating protein rendered on a transparent
 * canvas so the page aurora shows through. This is the thesis of the page — the
 * subject itself, in motion.
 */
export default function HeroViewer({
  src = "/samples/1UBQ.pdb",
}: {
  src?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let viewer: any = null;
    let io: IntersectionObserver | null = null;

    (async () => {
      try {
        const [mod, res] = await Promise.all([
          import("3dmol/build/3Dmol.js"),
          fetch(src),
        ]);
        const lib = (mod as any).default ?? mod;
        const pdb = await res.text();
        if (cancelled || !hostRef.current) return;

        viewer = lib.createViewer(hostRef.current, {
          backgroundColor: "black",
          backgroundAlpha: 0,
          antialias: true,
        });
        viewer.addModel(pdb, "pdb");
        // Spectrum along the chain (N→C) reads as the app's colormap language.
        viewer.setStyle({}, { cartoon: { color: "spectrum", thickness: 0.9 } });
        viewer.zoomTo();
        viewer.zoom(1.15);
        viewer.render();
        viewer.spin("y", 0.6);
        // Fade in once the first frame is painted.
        requestAnimationFrame(() => !cancelled && setVisible(true));

        // Pause the spin when scrolled out of view to save the GPU.
        if (hostRef.current) {
          io = new IntersectionObserver(
            ([entry]) => {
              try {
                viewer.spin(entry.isIntersecting ? "y" : false, 0.6);
              } catch {
                /* noop */
              }
            },
            { threshold: 0.05 }
          );
          io.observe(hostRef.current);
        }
      } catch {
        /* hero is decorative; fail silently */
      }
    })();

    return () => {
      cancelled = true;
      io?.disconnect();
      try {
        viewer?.spin(false);
        viewer?.clear();
      } catch {
        /* noop */
      }
    };
  }, [src]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 transition-opacity duration-1000"
      style={{
        opacity: visible ? 1 : 0,
        // 3Dmol positions its canvas absolutely inside this host.
        position: "absolute",
      }}
      aria-hidden
    />
  );
}
