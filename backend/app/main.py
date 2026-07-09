"""Helix FastAPI application.

Endpoints are thin wrappers around the tested `analysis` / `service` layer.
"""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response

from . import analysis, report, samples
from .analysis import ContactResult
from .parsing import PDBParseError
from .service import LoadedStructure, store

app = FastAPI(title="Helix API", version="1.0.0",
              description="Protein structure analysis backend.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev tool; tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _get(sid: str) -> LoadedStructure:
    try:
        return store.get(sid)
    except KeyError:
        raise HTTPException(404, "Structure not found. Upload or load it again.")


def _serialize_contacts(c: ContactResult) -> dict:
    dm = c.distance_matrix
    # Replace non-finite with None for valid JSON.
    dm_list = [[None if not np.isfinite(x) else round(float(x), 2) for x in row]
               for row in dm]
    return {
        "labels": c.labels,
        "indices": c.indices,
        "chains": c.chains,
        "cutoff": c.cutoff,
        "n_residues": len(c.labels),
        "n_contacts": c.n_contacts,
        "distance_matrix": dm_list,
        "contact_matrix": [[bool(x) for x in row] for row in c.contact_matrix],
    }


def _structure_payload(loaded: LoadedStructure) -> dict:
    return {
        "id": loaded.id,
        "source": loaded.source,
        "filename": loaded.filename,
        "summary": analysis.structure_summary(loaded.structure),
    }


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/samples")
def get_samples() -> dict:
    return {"samples": samples.list_samples()}


@app.get("/api/samples/{sample_id}/download", response_class=PlainTextResponse)
def download_sample(sample_id: str) -> Response:
    """Serve a bundled sample PDB so users can test the upload flow manually."""
    meta = samples.sample_meta(sample_id)
    if meta is None:
        raise HTTPException(404, f"Unknown sample '{sample_id}'.")
    return PlainTextResponse(
        samples.sample_text(sample_id),
        media_type="chemical/x-pdb",
        headers={"Content-Disposition": f"attachment; filename={meta['file']}"},
    )


@app.post("/api/structures/upload")
async def upload_structure(file: UploadFile = File(...)) -> dict:
    filename = (file.filename or "").strip()
    if not filename.lower().endswith((".pdb", ".ent", ".txt")):
        raise HTTPException(400, "Unsupported file type. Please upload a .pdb file.")
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(422, "The file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 20 MB).")
    try:
        text = raw.decode("utf-8", errors="replace")
    except Exception:
        raise HTTPException(400, "Could not decode file as text.")
    try:
        loaded = store.load_text(
            text, source="upload", name=filename, filename=filename
        )
    except PDBParseError as exc:
        raise HTTPException(422, f"Invalid PDB file: {exc}")
    return _structure_payload(loaded)


@app.post("/api/structures/sample/{sample_id}")
def load_sample(sample_id: str) -> dict:
    try:
        loaded = store.load_sample(sample_id)
    except KeyError:
        raise HTTPException(404, f"Unknown sample '{sample_id}'.")
    except PDBParseError as exc:
        raise HTTPException(422, f"Sample failed to parse: {exc}")
    return _structure_payload(loaded)


@app.get("/api/structures/{sid}/summary")
def get_summary(sid: str) -> dict:
    return analysis.structure_summary(_get(sid).structure)


@app.get("/api/structures/{sid}/pdb", response_class=PlainTextResponse)
def get_pdb(sid: str) -> str:
    return _get(sid).text


@app.get("/api/structures/{sid}/contacts")
def get_contacts(sid: str, cutoff: float = Query(8.0, ge=1.0, le=50.0)) -> dict:
    _get(sid)
    return _serialize_contacts(store.contacts(sid, cutoff))


@app.get("/api/structures/{sid}/contacts.csv", response_class=PlainTextResponse)
def get_contacts_csv(sid: str, cutoff: float = Query(8.0, ge=1.0, le=50.0),
                     matrix: bool = False) -> Response:
    _get(sid)
    contacts = store.contacts(sid, cutoff)
    csv_text = (report.distance_matrix_csv(contacts) if matrix
                else report.contacts_csv(contacts))
    fname = "distance_matrix.csv" if matrix else "contacts.csv"
    return PlainTextResponse(csv_text, headers={
        "Content-Disposition": f"attachment; filename={fname}"})


@app.get("/api/structures/{sid}/ramachandran")
def get_ramachandran(sid: str) -> dict:
    loaded = _get(sid)
    rows = loaded.dihedrals.rows
    n_outliers = sum(1 for r in rows if r["outlier"])
    return {
        "rows": rows,
        "n_residues": len(rows),
        "n_defined": sum(1 for r in rows if r["phi"] is not None and r["psi"] is not None),
        "n_outliers": n_outliers,
    }


@app.get("/api/structures/{sid}/ramachandran.csv", response_class=PlainTextResponse)
def get_ramachandran_csv(sid: str) -> Response:
    loaded = _get(sid)
    return PlainTextResponse(report.dihedrals_csv(loaded.dihedrals), headers={
        "Content-Disposition": "attachment; filename=ramachandran_angles.csv"})


@app.get("/api/structures/{sid}/secondary")
def get_secondary(sid: str) -> dict:
    return _get(sid).secondary


@app.get("/api/structures/{sid}/residue/{index}")
def get_residue(sid: str, index: int) -> dict:
    loaded = _get(sid)
    residue = next((r for r in loaded.structure.residues(amino_only=False)
                    if r.index == index), None)
    if residue is None:
        raise HTTPException(404, f"No residue with index {index}.")

    dihedral_row = next((r for r in loaded.dihedrals.rows if r["index"] == index), None)
    from .secondary import ss_for_index
    return {
        "index": residue.index,
        "name": residue.name,
        "one_letter": residue.one_letter,
        "seq": residue.seq,
        "icode": residue.icode,
        "chain": residue.chain,
        "is_amino": residue.is_amino,
        "label": residue.label,
        "coord": (None if residue.ca is None
                  else [round(float(x), 3) for x in residue.ca]),
        "atoms": sorted(residue.atoms.keys()),
        "missing_backbone": residue.missing_backbone(),
        "neighbors": analysis.neighbors_within(loaded.structure, residue, 8.0),
        "phi": dihedral_row["phi"] if dihedral_row else None,
        "psi": dihedral_row["psi"] if dihedral_row else None,
        "ss": ss_for_index(loaded.secondary, index),
    }


@app.get("/api/structures/{sid}/report")
def get_report(sid: str, cutoff: float = Query(8.0, ge=1.0, le=50.0)) -> Response:
    loaded = _get(sid)
    summary = analysis.structure_summary(loaded.structure)
    contacts = store.contacts(sid, cutoff)
    data = report.build_report_zip(summary, contacts, loaded.dihedrals, loaded.secondary)
    fname = f"helix_report_{loaded.structure.name.replace(' ', '_') or sid}.zip"
    return Response(content=data, media_type="application/zip", headers={
        "Content-Disposition": f"attachment; filename={fname}"})
