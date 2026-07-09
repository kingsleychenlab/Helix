"""Rough secondary-structure estimate from backbone dihedral geometry.

This is intentionally simple and *explainable* — it is NOT DSSP. We assign each
residue to helix / sheet / coil from its (phi, psi) angles, then require a
minimum run length so single stray residues don't become one-residue "helices".

Method
------
1. Per-residue raw state from the Ramachandran basin:
     helix  if  -160 <= phi <= -20  and  -90 <= psi <= 30
     sheet  if  -180 <= phi <= -40  and  (90 <= psi <= 180 or psi <= -150)
     coil   otherwise (or angles undefined)
2. Smoothing: a helix segment must span >= MIN_HELIX consecutive residues,
   a sheet segment >= MIN_SHEET; shorter runs demote to coil.

Clearly labeled as an estimate in the API and UI.
"""

from __future__ import annotations

from .analysis import DihedralResult
from .parsing import Structure

MIN_HELIX = 4
MIN_SHEET = 3


def _raw_state(phi: float | None, psi: float | None) -> str:
    if phi is None or psi is None:
        return "coil"
    if -160 <= phi <= -20 and -90 <= psi <= 30:
        return "helix"
    if -180 <= phi <= -40 and (90 <= psi <= 180 or psi <= -150):
        return "sheet"
    return "coil"


def _smooth(states: list[str]) -> list[str]:
    """Demote runs shorter than the minimum length to coil."""
    out = list(states)
    n = len(states)
    i = 0
    while i < n:
        j = i
        while j < n and states[j] == states[i]:
            j += 1
        run_len = j - i
        state = states[i]
        if state == "helix" and run_len < MIN_HELIX:
            for k in range(i, j):
                out[k] = "coil"
        elif state == "sheet" and run_len < MIN_SHEET:
            for k in range(i, j):
                out[k] = "coil"
        i = j
    return out


def estimate_secondary_structure(structure: Structure, dihedrals: DihedralResult) -> dict:
    """Return per-residue SS labels + summary fractions.

    Smoothing is applied *within each chain* so runs don't bleed across chain
    boundaries.
    """
    by_index = {row["index"]: row for row in dihedrals.rows}

    per_residue: list[dict] = []
    for chain in structure.chains:
        chain_rows = [by_index[r.index] for r in chain.residues
                      if r.is_amino and r.index in by_index]
        raw = [_raw_state(row["phi"], row["psi"]) for row in chain_rows]
        smoothed = _smooth(raw)
        for row, state in zip(chain_rows, smoothed):
            per_residue.append({
                "index": row["index"],
                "label": row["label"],
                "chain": row["chain"],
                "seq": row["seq"],
                "ss": state,
            })

    counts = {"helix": 0, "sheet": 0, "coil": 0}
    for r in per_residue:
        counts[r["ss"]] += 1
    total = max(len(per_residue), 1)

    return {
        "per_residue": per_residue,
        "counts": counts,
        "fractions": {k: round(v / total, 3) for k, v in counts.items()},
        "method": "phi/psi basin assignment + run-length smoothing (estimate)",
        "note": "Rough geometric estimate, not DSSP.",
    }


def ss_for_index(ss_result: dict, index: int) -> str:
    for r in ss_result["per_residue"]:
        if r["index"] == index:
            return r["ss"]
    return "coil"
