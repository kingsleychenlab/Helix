"""Unit tests for the pure geometry layer."""

import numpy as np
import pytest

from app import geometry


def test_distance_simple():
    assert geometry.distance([0, 0, 0], [3, 4, 0]) == pytest.approx(5.0)


def test_dihedral_planar_cis_is_zero():
    # Four points; p3 in the same plane, eclipsing p0 -> dihedral ~ 0.
    p0 = [1, 1, 0]
    p1 = [0, 0, 0]
    p2 = [1, 0, 0]
    p3 = [2, 1, 0]
    assert geometry.dihedral(p0, p1, p2, p3) == pytest.approx(0.0, abs=1e-6)


def test_dihedral_ninety_degrees():
    # Rotate the last atom 90 degrees out of plane -> +90 dihedral.
    p0 = [0, 1, 0]
    p1 = [0, 0, 0]
    p2 = [1, 0, 0]
    p3 = [1, 0, 1]
    assert geometry.dihedral(p0, p1, p2, p3) == pytest.approx(90.0, abs=1e-6)


def test_dihedral_sign_flips():
    p0 = [0, 1, 0]
    p1 = [0, 0, 0]
    p2 = [1, 0, 0]
    up = geometry.dihedral(p0, p1, p2, [1, 0, 1])
    down = geometry.dihedral(p0, p1, p2, [1, 0, -1])
    assert up == pytest.approx(-down, abs=1e-6)


def test_dihedral_degenerate_raises():
    with pytest.raises(ValueError):
        geometry.dihedral([0, 0, 0], [1, 0, 0], [1, 0, 0], [2, 0, 0])


def test_ca_distance_matrix_properties():
    coords = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=float)
    dm = geometry.ca_distance_matrix(coords)
    assert dm.shape == (3, 3)
    # symmetric, zero diagonal
    assert np.allclose(dm, dm.T)
    assert np.allclose(np.diag(dm), 0)
    assert dm[0, 1] == pytest.approx(1.0)
    assert dm[1, 2] == pytest.approx(np.sqrt(2))


def test_ca_distance_matrix_bad_shape():
    with pytest.raises(ValueError):
        geometry.ca_distance_matrix(np.zeros((3, 2)))


def test_contact_map_cutoff_and_diagonal():
    coords = np.array([[0, 0, 0], [1, 0, 0], [10, 0, 0]], dtype=float)
    dm = geometry.ca_distance_matrix(coords)
    cm = geometry.contact_map(dm, cutoff=8.0)
    assert cm[0, 1] and cm[1, 0]       # 1 A apart -> contact
    assert not cm[0, 2]                 # 10 A apart -> no contact
    assert not cm.diagonal().any()      # no self contacts
