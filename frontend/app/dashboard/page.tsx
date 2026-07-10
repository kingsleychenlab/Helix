"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import type {
  ContactData,
  LoadResponse,
  RamachandranData,
  ResidueDetail,
  SecondaryData,
} from "@/lib/types";
import Viewer, { type ViewStyle } from "@/components/Viewer";
import Controls, { ViewerToolbar } from "@/components/Controls";
import Dropzone from "@/components/Dropzone";
import SummaryPanel from "@/components/SummaryPanel";
import ContactMap from "@/components/ContactMap";
import Ramachandran from "@/components/Ramachandran";
import SecondaryStructure from "@/components/SecondaryStructure";
import ResidueInspector from "@/components/ResidueInspector";
import { Panel, Spinner, ErrorNote, Empty } from "@/components/ui";

export default function Dashboard() {
  const [loaded, setLoaded] = useState<LoadResponse | null>(null);
  const [pdbText, setPdbText] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactData | null>(null);
  const [rama, setRama] = useState<RamachandranData | null>(null);
  const [secondary, setSecondary] = useState<SecondaryData | null>(null);

  const [cutoff, setCutoff] = useState(8);
  const [style, setStyle] = useState<ViewStyle>("cartoon");
  const [colorByChain, setColorByChain] = useState(true);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [residue, setResidue] = useState<ResidueDetail | null>(null);
  const [residueLoading, setResidueLoading] = useState(false);

  // Changing representation clears the current selection so no highlight
  // lingers from the previous style.
  const changeStyle = (s: ViewStyle) => {
    setStyle(s);
    setSelectedIndex(null);
    setResidue(null);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sid = loaded?.id ?? null;
  const chainIds = useMemo(
    () => loaded?.summary.chains.map((c) => c.id) ?? [],
    [loaded]
  );

  // index -> {chain, seq} and "chain:seq" -> index, from the rama rows.
  const indexMaps = useMemo(() => {
    const toChainSeq = new Map<number, { chain: string; seq: number }>();
    const toIndex = new Map<string, number>();
    for (const r of rama?.rows ?? []) {
      toChainSeq.set(r.index, { chain: r.chain, seq: r.seq });
      toIndex.set(`${r.chain}:${r.seq}`, r.index);
    }
    return { toChainSeq, toIndex };
  }, [rama]);

  const selectedChainSeq = useMemo(
    () =>
      selectedIndex == null
        ? null
        : indexMaps.toChainSeq.get(selectedIndex) ?? null,
    [selectedIndex, indexMaps]
  );

  const resetDerived = () => {
    setSelectedIndex(null);
    setResidue(null);
    setContacts(null);
    setRama(null);
    setSecondary(null);
    setPdbText(null);
  };

  const loadStructure = useCallback(
    async (loader: () => Promise<LoadResponse>) => {
      setLoading(true);
      setError(null);
      resetDerived();
      try {
        const res = await loader();
        setLoaded(res);
        // Fetch all analyses in parallel through the same pipeline.
        const [text, con, ram, sec] = await Promise.all([
          api.pdbText(res.id),
          api.contacts(res.id, cutoff),
          api.ramachandran(res.id),
          api.secondary(res.id),
        ]);
        setPdbText(text);
        setContacts(con);
        setRama(ram);
        setSecondary(sec);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Something went wrong.");
        setLoaded(null);
        setPdbText(null);
      } finally {
        setLoading(false);
      }
    },
    [cutoff]
  );

  const uploadFile = useCallback(
    (file: File) => loadStructure(() => api.upload(file)),
    [loadStructure]
  );

  // Recompute contacts when the cutoff changes (debounced).
  useEffect(() => {
    if (!sid) return;
    const t = setTimeout(() => {
      api.contacts(sid, cutoff).then(setContacts).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [cutoff, sid]);

  // Fetch residue detail on selection.
  useEffect(() => {
    if (sid == null || selectedIndex == null) return;
    setResidueLoading(true);
    api
      .residue(sid, selectedIndex)
      .then(setResidue)
      .catch(() => setResidue(null))
      .finally(() => setResidueLoading(false));
  }, [sid, selectedIndex]);

  const pickByChainSeq = (chain: string, seq: number) => {
    const idx = indexMaps.toIndex.get(`${chain}:${seq}`);
    if (idx != null) setSelectedIndex(idx);
  };

  const showEmpty = !loaded && !loading;

  const col: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[var(--line)] backdrop-blur-xl bg-[rgba(6,7,13,0.55)] sticky top-0 z-20">
        <div className="px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="font-semibold tracking-tight shrink-0 grad-ink"
            >
              Helix
            </Link>
          </div>
          <Controls
            onUpload={uploadFile}
            busy={loading}
            hasStructure={!!loaded}
          />
        </div>
      </header>

      {error && (
        <div className="px-4 pt-3">
          <ErrorNote message={error} />
        </div>
      )}

      {showEmpty ? (
        <EmptyState onUpload={uploadFile} busy={loading} />
      ) : (
        /* Main grid */
        <main className="flex-1 p-4 grid gap-4 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px] items-start">
          {/* Left: summary */}
          <motion.div
            variants={col}
            initial="hidden"
            animate="show"
            className="space-y-4 order-2 lg:order-1"
          >
            <Panel title="Structure summary">
              {loading && !loaded ? (
                <Spinner label="Parsing structure…" />
              ) : loaded ? (
                <SummaryPanel
                  summary={loaded.summary}
                  filename={loaded.filename}
                  contactCount={contacts?.n_contacts}
                />
              ) : (
                <Empty>No structure loaded.</Empty>
              )}
            </Panel>
          </motion.div>

          {/* Center: viewer + secondary + inspector */}
          <motion.div
            variants={col}
            initial="hidden"
            animate="show"
            className="space-y-4 order-1 lg:order-2"
          >
            <Panel
              title="3D structure"
              actions={
                <ViewerToolbar
                  style={style}
                  setStyle={changeStyle}
                  colorByChain={colorByChain}
                  setColorByChain={setColorByChain}
                />
              }
              bodyClassName="p-0"
            >
              <div className="h-[520px] p-1">
                {loading && !pdbText ? (
                  <Spinner label="Loading coordinates…" />
                ) : (
                  <Viewer
                    pdbText={pdbText}
                    style={style}
                    colorByChain={colorByChain}
                    chainIds={chainIds}
                    selected={selectedChainSeq}
                    onPick={(r) => pickByChainSeq(r.chain, r.seq)}
                  />
                )}
              </div>
            </Panel>

            <Panel title="Secondary structure (estimate)">
              {secondary ? (
                <SecondaryStructure
                  data={secondary}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                />
              ) : loading ? (
                <Spinner />
              ) : (
                <Empty>—</Empty>
              )}
            </Panel>

            <Panel title="Residue inspector">
              <ResidueInspector
                detail={residue}
                loading={residueLoading}
                onSelectNeighbor={setSelectedIndex}
              />
            </Panel>
          </motion.div>

          {/* Right: contact map + ramachandran + report */}
          <motion.div
            variants={col}
            initial="hidden"
            animate="show"
            className="space-y-4 order-3"
          >
            <Panel
              title="Distance / contact map"
              actions={
                contacts && sid ? (
                  <a
                    className="btn-ghost text-[12px]"
                    href={api.contactsCsvUrl(sid, cutoff)}
                  >
                    ↓ CSV
                  </a>
                ) : null
              }
            >
              {contacts ? (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-[12px] text-[var(--muted)] w-24 shrink-0">
                      Cutoff {cutoff.toFixed(1)} Å
                    </span>
                    <input
                      type="range"
                      min={4}
                      max={16}
                      step={0.5}
                      value={cutoff}
                      onChange={(e) => setCutoff(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                  <ContactMap data={contacts} />
                </>
              ) : loading ? (
                <Spinner />
              ) : (
                <Empty>—</Empty>
              )}
            </Panel>

            <Panel
              title="Ramachandran plot"
              actions={
                rama && sid ? (
                  <a
                    className="btn-ghost text-[12px]"
                    href={api.ramachandranCsvUrl(sid)}
                  >
                    ↓ CSV
                  </a>
                ) : null
              }
            >
              {rama ? (
                <Ramachandran
                  data={rama}
                  chainIds={chainIds}
                  onSelect={(r) => setSelectedIndex(r.index)}
                />
              ) : loading ? (
                <Spinner />
              ) : (
                <Empty>—</Empty>
              )}
            </Panel>

            {sid && (
              <motion.a
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -2 }}
                className="btn btn-primary w-full justify-center"
                href={api.reportUrl(sid, cutoff)}
              >
                ↓ Download full report (.zip)
              </motion.a>
            )}
          </motion.div>
        </main>
      )}

      <footer className="border-t border-[var(--line)] px-4 py-3 text-[11px] text-[var(--faint)]">
        Cα distances · φ/ψ from N–CA–C vector geometry · secondary structure is a
        geometric estimate, not DSSP.
      </footer>
    </div>
  );
}

function EmptyState({
  onUpload,
  busy,
}: {
  onUpload: (file: File) => void;
  busy: boolean;
}) {
  return (
    <main className="flex-1 flex items-start justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl mt-6 sm:mt-16"
      >
        <p className="eyebrow text-center">Get started</p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-center">
          Load a protein structure
        </h1>
        <p className="mt-2 text-[14px] text-[var(--muted)] text-center">
          Drop a <span className="mono">.pdb</span> file to parse atoms, chains,
          and backbone geometry — then explore it in 3D.
        </p>

        <div className="panel p-5 mt-6">
          <Dropzone onFile={onUpload} busy={busy} />
        </div>

        <p className="mt-4 text-center text-[12px] text-[var(--faint)]">
          Files are parsed locally by your Helix backend — nothing is uploaded to
          a third party.
        </p>
      </motion.div>
    </main>
  );
}
