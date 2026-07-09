"""Tests for PDB parsing and structure summary."""

import pytest

from app import analysis
from app.parsing import PDBParseError, parse_pdb

# Minimal, valid two-residue peptide (Ala-Gly), one chain.
MINI_PDB = """\
ATOM      1  N   ALA A   1      0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   1      1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   1      2.009   1.420   0.000  1.00  0.00           C
ATOM      4  O   ALA A   1      1.251   2.390   0.000  1.00  0.00           O
ATOM      5  CB  ALA A   1      1.988  -0.773  -1.199  1.00  0.00           C
ATOM      6  N   GLY A   2      3.332   1.552   0.000  1.00  0.00           N
ATOM      7  CA  GLY A   2      3.999   2.845   0.000  1.00  0.00           C
ATOM      8  C   GLY A   2      5.510   2.680   0.000  1.00  0.00           C
ATOM      9  O   GLY A   2      6.009   1.550   0.000  1.00  0.00           O
TER
END
"""

# Same peptide but GLY is missing its C-alpha atom.
MISSING_CA_PDB = """\
ATOM      1  N   ALA A   1      0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   1      1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   1      2.009   1.420   0.000  1.00  0.00           C
ATOM      4  N   GLY A   2      3.332   1.552   0.000  1.00  0.00           N
ATOM      5  C   GLY A   2      5.510   2.680   0.000  1.00  0.00           C
END
"""


def test_parse_basic_counts():
    s = parse_pdb(MINI_PDB, name="mini")
    assert len(s.chains) == 1
    assert s.chains[0].id == "A"
    residues = s.residues()
    assert [r.name for r in residues] == ["ALA", "GLY"]
    assert residues[0].one_letter == "A"
    assert residues[1].one_letter == "G"
    assert s.n_atoms == 9


def test_residue_indices_are_global_and_sequential():
    s = parse_pdb(MINI_PDB)
    assert [r.index for r in s.residues()] == [0, 1]


def test_backbone_and_ca_access():
    s = parse_pdb(MINI_PDB)
    ala = s.residues()[0]
    assert ala.ca is not None
    bb = ala.backbone()
    assert bb is not None
    n, ca, c = bb
    assert ca == pytest.approx([1.458, 0.0, 0.0], abs=1e-3)


def test_missing_backbone_detected():
    s = parse_pdb(MISSING_CA_PDB)
    summary = analysis.structure_summary(s)
    assert summary["n_missing_backbone"] >= 1
    gly = s.residues()[1]
    assert "CA" in gly.missing_backbone()
    assert gly.ca is None  # skipped safely, not a crash


def test_empty_input_raises():
    with pytest.raises(PDBParseError):
        parse_pdb("")


def test_garbage_input_raises():
    with pytest.raises(PDBParseError):
        parse_pdb("this is not a pdb file at all\njust some words\n")


def test_summary_composition_has_all_20():
    s = parse_pdb(MINI_PDB)
    summary = analysis.structure_summary(s)
    assert len(summary["composition"]) == 20
    assert summary["composition"]["ALA"] == 1
    assert summary["composition"]["GLY"] == 1
    assert summary["composition"]["TRP"] == 0
