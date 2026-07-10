"""Higher-level structural analysis built on `parsing` + `geometry`.

Each function takes a parsed `Structure` (or residue list) and returns plain
Python / NumPy data ready to be serialized to JSON or written to CSV.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

import numpy as np

from . import geometry
from .parsing import BACKBONE_ATOMS, THREE_TO_ONE, Residue, Structure

# --------------------------------------------------------------------------- #
# Structure summary
# --------------------------------------------------------------------------- #


def structure_summary(structure: Structure) -> dict:
    """Counts, composition, chain lengths, and missing-backbone warnings."""
    amino = structure.residues(amino_only=True)
    composition = Counter(r.name for r in amino)
    # Ensure all 20 standard residues appear (0 if absent) for stable UI.
    full_composition = {aa: composition.get(aa, 0) for aa in THREE_TO_ONE}

    missing = []
    for res in amino:
        gaps = res.missing_backbone()
        if gaps:
            missing.append({"residue": res.label, "index": res.index, "missing": gaps})

    return {
        "name": structure.name,
        "header": structure.header,
        "n_chains": len(structure.chains),
        "n_residues": len(amino),
        "n_atoms": structure.n_atoms,
        "chains": [
            {"id": c.id, "length": c.length, "n_residues": len(c.residues)}
            for c in structure.chains
        ],
        "composition": full_composition,
        "missing_backbone": missing,
        "n_missing_backbone": len(missing),
    }


# --------------------------------------------------------------------------- #
# Distance + contact maps (C-alpha)
# --------------------------------------------------------------------------- #


@dataclass
class ContactResult:
    labels: list[str]
    indices: list[int]
    chains: list[str]
    distance_matrix: np.ndarray  # (N, N) float, NaN where a CA is missing
    contact_matrix: np.ndarray   # (N, N) bool
    cutoff: float
    n_contacts: int


def ca_residues(structure: Structure) -> list[Residue]:
    """Amino-acid residues that actually have a C-alpha atom."""
    return [r for r in structure.residues(amino_only=True) if r.ca is not None]


def distance_and_contacts(structure: Structure, cutoff: float = 8.0) -> ContactResult:
    """Pairwise C-alpha distance matrix and contact map at `cutoff` angstroms.

    Residues without a CA atom are skipped safely (never crash). Contacts are
    counted as unique residue pairs (upper triangle).
    """
    residues = ca_residues(structure)
    coords = np.array([r.ca for r in residues], dtype=float)

    if len(residues) == 0:
        empty = np.zeros((0, 0))
        return ContactResult([], [], [], empty, empty.astype(bool), cutoff, 0)

    dist = geometry.ca_distance_matrix(coords)
    contacts = geometry.contact_map(dist, cutoff)
    n_contacts = int(np.sum(np.triu(contacts, k=1)))

    return ContactResult(
        labels=[r.label for r in residues],
        indices=[r.index for r in residues],
        chains=[r.chain for r in residues],
        distance_matrix=dist,
        contact_matrix=contacts,
        cutoff=cutoff,
        n_contacts=n_contacts,
    )


def neighbors_within(structure: Structure, target: Residue, radius: float = 8.0) -> list[dict]:
    """Residues whose CA lies within `radius` of the target residue's CA."""
    if target.ca is None:
        return []
    out = []
    for res in ca_residues(structure):
        if res.index == target.index:
            continue
        d = geometry.distance(target.ca, res.ca)
        if d <= radius:
            out.append({"label": res.label, "index": res.index, "chain": res.chain,
                        "distance": round(d, 2)})
    out.sort(key=lambda x: x["distance"])
    return out


# --------------------------------------------------------------------------- #
# Ramachandran / backbone dihedral angles
# --------------------------------------------------------------------------- #


@dataclass
class DihedralResult:
    rows: list[dict]  # one dict per residue with phi/psi (may be None)

    def phi_psi_arrays(self) -> tuple[np.ndarray, np.ndarray]:
        phi = np.array([r["phi"] for r in self.rows if r["phi"] is not None
                        and r["psi"] is not None])
        psi = np.array([r["psi"] for r in self.rows if r["phi"] is not None
                        and r["psi"] is not None])
        return phi, psi


def backbone_dihedrals(structure: Structure) -> DihedralResult:
    """Compute phi/psi for every amino-acid residue, per chain.

    phi(i)  = dihedral( C(i-1),  N(i),  CA(i), C(i)  )
    psi(i)  = dihedral( N(i),   CA(i),  C(i),  N(i+1))

    Residues at chain breaks / missing backbone atoms get None for the
    undefined angle. Angles are only computed within a single chain.
    """
    rows: list[dict] = []
    for chain in structure.chains:
        residues = [r for r in chain.residues if r.is_amino]
        for i, res in enumerate(residues):
            phi = psi = None
            bb = res.backbone()
            if bb is not None:
                n, ca, c = bb
                # phi needs C of the previous residue, peptide-bonded to this N
                if i > 0:
                    prev = residues[i - 1]
                    prev_c = prev.atom_coord("C")
                    if prev_c is not None and _peptide_bonded(prev, res):
                        phi = geometry.dihedral(prev_c, n, ca, c)
                # psi needs N of the next residue, peptide-bonded to this C
                if i < len(residues) - 1:
                    nxt = residues[i + 1]
                    next_n = nxt.atom_coord("N")
                    if next_n is not None and _peptide_bonded(res, nxt):
                        psi = geometry.dihedral(n, ca, c, next_n)
            rows.append({
                "index": res.index,
                "residue": res.name,
                "one_letter": res.one_letter,
                "seq": res.seq,
                "chain": res.chain,
                "label": res.label,
                "phi": None if phi is None else round(phi, 2),
                "psi": None if psi is None else round(psi, 2),
                "region": _rama_region(phi, psi),
                "outlier": _is_outlier(phi, psi),
            })
    return DihedralResult(rows=rows)


def _peptide_bonded(a: Residue, b: Residue, max_cn: float = 2.0) -> bool:
    """True if residue `a` is peptide-bonded to residue `b` (a.C — b.N).

    The C(i)–N(i+1) peptide bond is ~1.33 Å; we allow up to `max_cn` Å for
    geometric distortion. This is the physically correct chain-continuity test:
    it connects genuine neighbors regardless of author numbering / insertion
    codes, and correctly breaks φ/ψ across chain gaps even when residue numbers
    happen to stay consecutive.
    """
    c = a.atom_coord("C")
    n = b.atom_coord("N")
    if c is None or n is None:
        return False
    return geometry.distance(c, n) <= max_cn


def _rama_region(phi: float | None, psi: float | None) -> str:
    """Very rough Ramachandran region label from phi/psi (degrees)."""
    if phi is None or psi is None:
        return "undefined"
    # Right-handed alpha helix basin.
    if -160 <= phi <= -20 and -120 <= psi <= 50:
        # split helix vs sheet by psi
        if -100 <= psi <= 50:
            return "alpha"
    # Beta sheet basin.
    if -180 <= phi <= -40 and (90 <= psi <= 180 or -180 <= psi <= -150):
        return "beta"
    # Left-handed helix (rare, often Gly).
    if 20 <= phi <= 90 and -20 <= psi <= 90:
        return "left_alpha"
    return "other"


def _is_outlier(phi: float | None, psi: float | None) -> bool:
    """Flag angles far outside the common allowed basins.

    Simple, explainable rule: not in any recognized region AND not near the
    generously-allowed borders. This is a coarse flag, not a validation-grade
    Ramachandran check.
    """
    if phi is None or psi is None:
        return False
    return _rama_region(phi, psi) == "other" and not (
        -180 <= phi <= -40 and -180 <= psi <= 180
    )
