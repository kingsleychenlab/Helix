"""PDB parsing built on BioPython, normalized into lightweight dataclasses.

The rest of the codebase depends only on these dataclasses (not on BioPython
objects), which keeps the analysis + math layers easy to test in isolation.
"""

from __future__ import annotations

import io
import warnings
from dataclasses import dataclass, field

import numpy as np
from Bio.PDB import PDBParser
from Bio.PDB.PDBExceptions import PDBConstructionWarning

# Standard amino acids: 3-letter -> 1-letter.
THREE_TO_ONE: dict[str, str] = {
    "ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C",
    "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I",
    "LEU": "L", "LYS": "K", "MET": "M", "PHE": "F", "PRO": "P",
    "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V",
}

BACKBONE_ATOMS = ("N", "CA", "C", "O")


class PDBParseError(Exception):
    """Raised when a PDB file cannot be parsed into a usable structure."""


@dataclass
class Atom:
    name: str
    element: str
    coord: np.ndarray  # shape (3,)


@dataclass
class Residue:
    name: str          # 3-letter residue name, e.g. "ALA"
    seq: int           # author residue sequence number
    icode: str         # insertion code ("" if none)
    chain: str         # parent chain id
    index: int         # global 0-based index across the whole structure
    atoms: dict[str, Atom] = field(default_factory=dict)

    @property
    def is_amino(self) -> bool:
        return self.name in THREE_TO_ONE

    @property
    def one_letter(self) -> str:
        return THREE_TO_ONE.get(self.name, "X")

    def atom_coord(self, name: str) -> np.ndarray | None:
        atom = self.atoms.get(name)
        return atom.coord if atom is not None else None

    @property
    def ca(self) -> np.ndarray | None:
        return self.atom_coord("CA")

    def backbone(self) -> tuple[np.ndarray, np.ndarray, np.ndarray] | None:
        """Return (N, CA, C) coords, or None if any backbone atom is missing."""
        n, ca, c = self.atom_coord("N"), self.atom_coord("CA"), self.atom_coord("C")
        if n is None or ca is None or c is None:
            return None
        return n, ca, c

    def missing_backbone(self) -> list[str]:
        """Backbone atoms (N, CA, C, O) absent from an amino-acid residue."""
        if not self.is_amino:
            return []
        return [a for a in BACKBONE_ATOMS if a not in self.atoms]

    @property
    def label(self) -> str:
        return f"{self.chain}:{self.name}{self.seq}{self.icode}".strip()


@dataclass
class Chain:
    id: str
    residues: list[Residue] = field(default_factory=list)

    @property
    def length(self) -> int:
        return len([r for r in self.residues if r.is_amino])


@dataclass
class Structure:
    name: str
    chains: list[Chain] = field(default_factory=list)
    header: dict = field(default_factory=dict)

    def residues(self, amino_only: bool = True) -> list[Residue]:
        out: list[Residue] = []
        for chain in self.chains:
            for res in chain.residues:
                if amino_only and not res.is_amino:
                    continue
                out.append(res)
        return out

    @property
    def n_atoms(self) -> int:
        return sum(len(r.atoms) for c in self.chains for r in c.residues)


def parse_pdb(text: str, name: str = "structure") -> Structure:
    """Parse PDB text into a Structure.

    Only the first model is used (typical for X-ray structures; for NMR
    ensembles this takes model 1). Alt-loc atoms collapse to the first
    occurrence per atom name. Raises PDBParseError on unusable input.
    """
    if not text or not text.strip():
        raise PDBParseError("Empty file.")

    parser = PDBParser(QUIET=True)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PDBConstructionWarning)
            bio_structure = parser.get_structure(name, io.StringIO(text))
    except Exception as exc:  # BioPython raises a variety of exceptions
        raise PDBParseError(f"Could not parse PDB: {exc}") from exc

    models = list(bio_structure.get_models())
    if not models:
        raise PDBParseError("No models found in file.")
    model = models[0]

    header = _extract_header(bio_structure)
    structure = Structure(name=header.get("name") or name, header=header)

    global_index = 0
    for bio_chain in model:
        chain = Chain(id=bio_chain.id.strip() or "A")
        for bio_res in bio_chain:
            het_flag, seq, icode = bio_res.id
            # Skip water; keep other hetero groups (ligands) so they show up,
            # but they simply won't be flagged as amino acids.
            if het_flag == "W":
                continue
            atoms: dict[str, Atom] = {}
            for bio_atom in bio_res:
                aname = bio_atom.get_name().strip()
                if aname in atoms:
                    continue  # keep first alt-loc only
                atoms[aname] = Atom(
                    name=aname,
                    element=(bio_atom.element or "").strip(),
                    coord=np.asarray(bio_atom.get_coord(), dtype=float),
                )
            residue = Residue(
                name=bio_res.resname.strip(),
                seq=int(seq),
                icode=icode.strip(),
                chain=chain.id,
                index=global_index,
                atoms=atoms,
            )
            chain.residues.append(residue)
            global_index += 1
        if chain.residues:
            structure.chains.append(chain)

    if not structure.residues(amino_only=True):
        raise PDBParseError("No amino-acid residues found in structure.")

    return structure


def _extract_header(bio_structure) -> dict:
    header = getattr(bio_structure, "header", {}) or {}
    name = ""
    compound = header.get("compound", {})
    if isinstance(compound, dict):
        for entry in compound.values():
            if isinstance(entry, dict) and entry.get("molecule"):
                name = entry["molecule"].strip().title()
                break
    if not name:
        name = (header.get("name") or "").strip().title()
    return {
        "name": name,
        "idcode": header.get("idcode", ""),
        "resolution": header.get("resolution"),
        "structure_method": header.get("structure_method", ""),
    }
