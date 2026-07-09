"""Tests for distance/contact maps, dihedrals, and secondary structure,
running against a real bundled structure (crambin)."""

import numpy as np
import pytest

from app import analysis, samples, secondary
from app.parsing import parse_pdb


@pytest.fixture(scope="module")
def crambin():
    return parse_pdb(samples.sample_text("1crn"), name="Crambin")


def test_crambin_residue_count(crambin):
    # Crambin is a 46-residue protein.
    assert len(crambin.residues()) == 46


def test_distance_matrix_shape_and_symmetry(crambin):
    result = analysis.distance_and_contacts(crambin, cutoff=8.0)
    n = len(result.labels)
    assert result.distance_matrix.shape == (n, n)
    assert np.allclose(result.distance_matrix, result.distance_matrix.T)
    assert np.allclose(np.diag(result.distance_matrix), 0.0)


def test_contact_map_is_symmetric_and_cutoff_monotonic(crambin):
    tight = analysis.distance_and_contacts(crambin, cutoff=6.0)
    loose = analysis.distance_and_contacts(crambin, cutoff=12.0)
    assert np.array_equal(tight.contact_matrix, tight.contact_matrix.T)
    # A larger cutoff can only add contacts, never remove them.
    assert loose.n_contacts >= tight.n_contacts
    # Sequential neighbors (~3.8 A CA-CA) are always in contact at 8 A.
    result = analysis.distance_and_contacts(crambin, cutoff=8.0)
    assert result.contact_matrix[0, 1]


def test_dihedrals_defined_and_in_range(crambin):
    dihedrals = analysis.backbone_dihedrals(crambin)
    rows = dihedrals.rows
    assert len(rows) == 46
    # First residue has no phi; last has no psi.
    assert rows[0]["phi"] is None
    assert rows[-1]["psi"] is None
    # Interior residues should have both, within [-180, 180].
    interior = rows[10]
    assert interior["phi"] is not None and interior["psi"] is not None
    for r in rows:
        for angle in (r["phi"], r["psi"]):
            if angle is not None:
                assert -180.0 <= angle <= 180.0


def test_neighbors_within_are_sorted_and_close(crambin):
    target = crambin.residues()[20]
    neighbors = analysis.neighbors_within(crambin, target, radius=8.0)
    assert neighbors, "expected some neighbors within 8 A"
    dists = [n["distance"] for n in neighbors]
    assert dists == sorted(dists)
    assert all(d <= 8.0 for d in dists)
    assert target.index not in [n["index"] for n in neighbors]


def test_secondary_structure_fractions_sum_to_one(crambin):
    dihedrals = analysis.backbone_dihedrals(crambin)
    ss = secondary.estimate_secondary_structure(crambin, dihedrals)
    frac = ss["fractions"]
    assert frac["helix"] + frac["sheet"] + frac["coil"] == pytest.approx(1.0, abs=0.01)
    # Crambin has two alpha helices -> expect a non-trivial helix fraction.
    assert frac["helix"] > 0.1
