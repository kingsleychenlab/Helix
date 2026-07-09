"""Report generation: matplotlib plots + a bundled downloadable ZIP.

Uses the non-interactive Agg backend so it renders on a headless server.
"""

from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from .analysis import ContactResult, DihedralResult  # noqa: E402

# Muted, scientific palette (light mode).
_HELIX_C = "#d1495b"
_SHEET_C = "#2a628f"
_COIL_C = "#8d99ae"


def contact_map_png(contacts: ContactResult) -> bytes:
    """Render the C-alpha distance matrix as a heatmap PNG."""
    fig, ax = plt.subplots(figsize=(6, 5), dpi=120)
    if contacts.distance_matrix.size == 0:
        ax.text(0.5, 0.5, "No data", ha="center", va="center")
    else:
        im = ax.imshow(contacts.distance_matrix, cmap="viridis", origin="lower")
        cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cbar.set_label("Cα–Cα distance (Å)")
    ax.set_title("Residue distance map")
    ax.set_xlabel("Residue index")
    ax.set_ylabel("Residue index")
    return _fig_to_png(fig)


def ramachandran_png(dihedrals: DihedralResult) -> bytes:
    """Scatter of phi vs psi with the common allowed basins shaded."""
    phi, psi = dihedrals.phi_psi_arrays()
    fig, ax = plt.subplots(figsize=(5.5, 5), dpi=120)

    # Shaded reference basins (alpha + beta) for orientation.
    ax.axhspan(-90, 30, xmin=(-160 + 180) / 360, xmax=(-20 + 180) / 360,
               color=_HELIX_C, alpha=0.08)
    ax.axhspan(90, 180, xmin=(-180 + 180) / 360, xmax=(-40 + 180) / 360,
               color=_SHEET_C, alpha=0.08)

    if phi.size:
        ax.scatter(phi, psi, s=12, c=_SHEET_C, alpha=0.7, edgecolors="none")
    ax.set_xlim(-180, 180)
    ax.set_ylim(-180, 180)
    ax.axhline(0, color="#cccccc", lw=0.6)
    ax.axvline(0, color="#cccccc", lw=0.6)
    ax.set_xticks(range(-180, 181, 90))
    ax.set_yticks(range(-180, 181, 90))
    ax.set_xlabel("φ (phi)")
    ax.set_ylabel("ψ (psi)")
    ax.set_title("Ramachandran plot")
    return _fig_to_png(fig)


def _fig_to_png(fig) -> bytes:
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png")
    plt.close(fig)
    return buf.getvalue()


def contacts_csv(contacts: ContactResult) -> str:
    """CSV of contacting residue pairs (upper triangle)."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["residue_i", "residue_j", "distance_A", "in_contact"])
    n = len(contacts.labels)
    dm = contacts.distance_matrix
    cm = contacts.contact_matrix
    for i in range(n):
        for j in range(i + 1, n):
            if cm[i, j]:
                writer.writerow([contacts.labels[i], contacts.labels[j],
                                 round(float(dm[i, j]), 3), True])
    return buf.getvalue()


def distance_matrix_csv(contacts: ContactResult) -> str:
    """Full distance matrix as CSV (labels as header row + index column)."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([""] + contacts.labels)
    for i, label in enumerate(contacts.labels):
        row = [label] + [round(float(x), 3) for x in contacts.distance_matrix[i]]
        writer.writerow(row)
    return buf.getvalue()


def dihedrals_csv(dihedrals: DihedralResult) -> str:
    """CSV of the phi/psi angle table."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["index", "chain", "seq", "residue", "phi", "psi",
                     "region", "outlier"])
    for r in dihedrals.rows:
        writer.writerow([r["index"], r["chain"], r["seq"], r["residue"],
                         r["phi"], r["psi"], r["region"], r["outlier"]])
    return buf.getvalue()


def build_report_zip(
    summary: dict,
    contacts: ContactResult,
    dihedrals: DihedralResult,
    secondary: dict,
) -> bytes:
    """Bundle summary, CSVs, plots, and an HTML report into a single ZIP."""
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    html = _report_html(summary, contacts, dihedrals, secondary, generated)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("report.html", html)
        zf.writestr("summary.json", json.dumps(summary, indent=2))
        zf.writestr("contacts.csv", contacts_csv(contacts))
        zf.writestr("distance_matrix.csv", distance_matrix_csv(contacts))
        zf.writestr("ramachandran_angles.csv", dihedrals_csv(dihedrals))
        zf.writestr("plots/contact_map.png", contact_map_png(contacts))
        zf.writestr("plots/ramachandran.png", ramachandran_png(dihedrals))
    return buf.getvalue()


def _report_html(summary, contacts, dihedrals, secondary, generated) -> str:
    comp = summary["composition"]
    comp_rows = "".join(
        f"<tr><td>{aa}</td><td>{n}</td></tr>"
        for aa, n in sorted(comp.items(), key=lambda x: -x[1]) if n > 0
    )
    chain_rows = "".join(
        f"<tr><td>{c['id']}</td><td>{c['length']}</td></tr>"
        for c in summary["chains"]
    )
    warnings_html = (
        "<p class='ok'>No missing backbone atoms detected.</p>"
        if summary["n_missing_backbone"] == 0
        else "<ul>" + "".join(
            f"<li>{m['residue']} missing {', '.join(m['missing'])}</li>"
            for m in summary["missing_backbone"]
        ) + "</ul>"
    )
    frac = secondary["fractions"]
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Helix report — {summary['name']}</title>
<style>
 body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#1a1a1a;
        max-width: 820px; margin: 40px auto; padding: 0 20px; line-height:1.5; }}
 h1 {{ font-weight:600; letter-spacing:-0.02em; }}
 h2 {{ font-weight:600; margin-top:2em; border-bottom:1px solid #eee; padding-bottom:4px;}}
 table {{ border-collapse: collapse; margin: 8px 0; }}
 td, th {{ border:1px solid #e5e5e5; padding:4px 10px; text-align:left; font-size:14px;}}
 .grid {{ display:flex; gap:40px; flex-wrap:wrap; }}
 .stat {{ font-size:28px; font-weight:600; }}
 .muted {{ color:#666; font-size:13px; }}
 .ok {{ color:#2a7d4f; }}
 img {{ max-width:100%; border:1px solid #eee; border-radius:6px; }}
</style></head><body>
<h1>Helix report</h1>
<p class="muted">{summary['name'] or 'Protein structure'} · generated {generated}</p>

<h2>Structure summary</h2>
<div class="grid">
 <div><div class="stat">{summary['n_chains']}</div><div class="muted">chains</div></div>
 <div><div class="stat">{summary['n_residues']}</div><div class="muted">residues</div></div>
 <div><div class="stat">{summary['n_atoms']}</div><div class="muted">atoms</div></div>
 <div><div class="stat">{contacts.n_contacts}</div><div class="muted">contacts (≤{contacts.cutoff}Å)</div></div>
</div>

<h2>Chain lengths</h2>
<table><tr><th>Chain</th><th>Residues</th></tr>{chain_rows}</table>

<h2>Secondary structure (estimate)</h2>
<p>Helix {frac['helix']*100:.0f}% · Sheet {frac['sheet']*100:.0f}% · Coil {frac['coil']*100:.0f}%</p>
<p class="muted">{secondary['method']}</p>

<h2>Amino-acid composition</h2>
<table><tr><th>Residue</th><th>Count</th></tr>{comp_rows}</table>

<h2>Contact map</h2>
<p class="muted">Cα–Cα distances; contact cutoff {contacts.cutoff}Å.</p>
<img src="plots/contact_map.png" alt="contact map">

<h2>Ramachandran plot</h2>
<img src="plots/ramachandran.png" alt="ramachandran plot">
<p class="muted">Full angle table in <code>ramachandran_angles.csv</code>.</p>

<h2>Geometry warnings</h2>
{warnings_html}
</body></html>"""
