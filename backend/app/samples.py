"""Registry of bundled sample proteins so the app works out-of-the-box."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "samples"

SAMPLES: list[dict] = [
    {
        "id": "1crn",
        "file": "1CRN.pdb",
        "name": "Crambin",
        "pdb_id": "1CRN",
        "description": "46-residue plant seed protein; compact mixed α/β fold.",
    },
    {
        "id": "1ubq",
        "file": "1UBQ.pdb",
        "name": "Ubiquitin",
        "pdb_id": "1UBQ",
        "description": "76-residue regulatory protein; classic β-grasp fold.",
    },
    {
        "id": "1l2y",
        "file": "1L2Y.pdb",
        "name": "Trp-cage (TC5b)",
        "pdb_id": "1L2Y",
        "description": "20-residue mini-protein; one short α-helix (NMR model 1).",
    },
]

_BY_ID = {s["id"]: s for s in SAMPLES}


def list_samples() -> list[dict]:
    return [{k: v for k, v in s.items() if k != "file"} for s in SAMPLES]


@lru_cache(maxsize=None)
def sample_text(sample_id: str) -> str:
    meta = _BY_ID.get(sample_id)
    if meta is None:
        raise KeyError(sample_id)
    return (SAMPLE_DIR / meta["file"]).read_text()


def sample_meta(sample_id: str) -> dict | None:
    return _BY_ID.get(sample_id)
