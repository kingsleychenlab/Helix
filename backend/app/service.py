"""In-memory structure store + analysis orchestration.

Structures are parsed once on load and cached by id. This is a single-process
dev tool, so an in-memory dict is sufficient; swap for Redis/DB to scale.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from . import analysis, samples, secondary
from .analysis import ContactResult, DihedralResult
from .parsing import Structure, parse_pdb


@dataclass
class LoadedStructure:
    id: str
    text: str
    structure: Structure
    source: str  # "upload" or "sample:<id>"
    filename: str = ""  # original uploaded/sample file name

    # lazily computed + cached
    _dihedrals: DihedralResult | None = None
    _secondary: dict | None = None

    @property
    def dihedrals(self) -> DihedralResult:
        if self._dihedrals is None:
            self._dihedrals = analysis.backbone_dihedrals(self.structure)
        return self._dihedrals

    @property
    def secondary(self) -> dict:
        if self._secondary is None:
            self._secondary = secondary.estimate_secondary_structure(
                self.structure, self.dihedrals)
        return self._secondary


class StructureStore:
    def __init__(self) -> None:
        self._store: dict[str, LoadedStructure] = {}

    def load_text(
        self, text: str, source: str, name: str = "structure", filename: str = ""
    ) -> LoadedStructure:
        structure = parse_pdb(text, name=name)  # may raise PDBParseError
        sid = uuid.uuid4().hex[:12]
        loaded = LoadedStructure(
            id=sid, text=text, structure=structure, source=source, filename=filename
        )
        self._store[sid] = loaded
        return loaded

    def load_sample(self, sample_id: str) -> LoadedStructure:
        meta = samples.sample_meta(sample_id)
        if meta is None:
            raise KeyError(sample_id)
        text = samples.sample_text(sample_id)
        return self.load_text(
            text,
            source=f"sample:{sample_id}",
            name=meta["name"],
            filename=meta["file"],
        )

    def get(self, sid: str) -> LoadedStructure:
        if sid not in self._store:
            raise KeyError(sid)
        return self._store[sid]

    def contacts(self, sid: str, cutoff: float = 8.0) -> ContactResult:
        return analysis.distance_and_contacts(self.get(sid).structure, cutoff)


store = StructureStore()
