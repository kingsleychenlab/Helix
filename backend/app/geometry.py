"""Pure geometric math for protein structures.

Everything here operates on plain NumPy arrays so the functions are trivially
unit-testable without any PDB parsing or web framework in the loop.

References
----------
Dihedral angle: the angle between the plane (p0, p1, p2) and the plane
(p1, p2, p3), measured about the p1->p2 axis. Computed with the numerically
stable atan2 formulation (Praxeolitic / Blondel & Karplus 1996).
"""

from __future__ import annotations

import numpy as np

Vector = np.ndarray


def distance(a: Vector, b: Vector) -> float:
    """Euclidean distance between two 3D points."""
    return float(np.linalg.norm(np.asarray(a, dtype=float) - np.asarray(b, dtype=float)))


def dihedral(p0: Vector, p1: Vector, p2: Vector, p3: Vector) -> float:
    """Signed dihedral angle (in degrees) defined by four points.

    Uses cross products to build the two plane normals and atan2 for a
    numerically stable, correctly-signed result in the range (-180, 180].
    """
    p0 = np.asarray(p0, dtype=float)
    p1 = np.asarray(p1, dtype=float)
    p2 = np.asarray(p2, dtype=float)
    p3 = np.asarray(p3, dtype=float)

    b0 = p0 - p1
    b1 = p2 - p1
    b2 = p3 - p2

    # Normalize the central bond vector so projections are well-scaled.
    b1_norm = np.linalg.norm(b1)
    if b1_norm == 0:
        raise ValueError("Degenerate dihedral: central atoms coincide.")
    b1 = b1 / b1_norm

    # Project b0 and b2 onto the plane perpendicular to b1.
    v = b0 - np.dot(b0, b1) * b1
    w = b2 - np.dot(b2, b1) * b1

    x = np.dot(v, w)
    y = np.dot(np.cross(b1, v), w)
    angle = np.degrees(np.arctan2(y, x))
    return float(angle)


def ca_distance_matrix(coords: np.ndarray) -> np.ndarray:
    """Pairwise Euclidean distance matrix for an (N, 3) array of coordinates.

    Vectorized: broadcasts coords against itself. Returns an (N, N) symmetric
    matrix with a zero diagonal.
    """
    coords = np.asarray(coords, dtype=float)
    if coords.ndim != 2 or coords.shape[1] != 3:
        raise ValueError("coords must have shape (N, 3)")
    diff = coords[:, None, :] - coords[None, :, :]
    return np.sqrt(np.sum(diff * diff, axis=-1))


def contact_map(dist_matrix: np.ndarray, cutoff: float = 8.0) -> np.ndarray:
    """Boolean contact map: True where residues are within `cutoff` angstroms.

    The diagonal (self-contact) is excluded.
    """
    dist_matrix = np.asarray(dist_matrix, dtype=float)
    contacts = dist_matrix <= cutoff
    np.fill_diagonal(contacts, False)
    return contacts
