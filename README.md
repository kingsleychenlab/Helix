<div align="center">

# Helix

**Protein structure analysis made simple.**

Helix turns a raw PDB file into clear 3D visuals and quantitative reports —
residue distance maps, Ramachandran plots, backbone angles, contact maps, and a
geometric secondary-structure estimate — using real biochemical math.

</div>

---

## What is Helix?

Protein structures are hard to read from raw PDB files. Coordinates alone don't
tell you which residues are in contact, whether the backbone geometry is
reasonable, or where the helices and sheets are. Helix parses a structure,
renders it in 3D, and computes a set of standard structural analyses that are
common in computational biology — each one derived from first principles and
exposed through a clean, minimal interface.

It is built as a small, honest full-stack tool: a modular, tested Python backend
that does the science, and a TypeScript/Next.js frontend that makes it usable.

## Why protein structure analysis matters

The three-dimensional shape of a protein determines its function. Distance and
contact maps reveal the fold's topology and long-range interactions;
Ramachandran plots validate backbone geometry and flag strained conformations;
secondary-structure content summarizes the fold at a glance. These analyses
underpin structure validation, comparative modeling, docking, and machine
learning on proteins (contact maps and dihedral features are common model
inputs). Helix implements the core primitives that all of these build on.

## Setup

### Quick start (both servers)

```bash
./dev.sh
```

Then open **http://localhost:3000**. The script creates the Python venv,
installs dependencies on first run, and starts both servers.

### Manual setup

**Backend** (http://127.0.0.1:8000):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (http://127.0.0.1:3000):

```bash
cd frontend
npm install
npm run dev          # or: npm run build && npm run start
```

The frontend talks to the backend at `http://127.0.0.1:8000` by default; override
with `NEXT_PUBLIC_API_URL` (see `frontend/.env.local.example`).

### Tests

```bash
cd backend
./.venv/bin/python -m pytest        # 33 tests: parsing, geometry, analysis, API
```

## Using Helix

Open **http://localhost:3000** and click **Launch app** to reach the dashboard.

**Upload a PDB file.** On the dashboard's start screen, drag a `.pdb` file onto
the drop zone or click to browse. The file is parsed by your local backend; the
original file name is shown in the header and summary. Non-`.pdb` files, empty
files, and malformed structures are rejected with a clear message and never
crash the app. Helix is bring-your-own-data — nothing is sent to a third party.

Once a structure is loaded, the dashboard shows the 3D view, structure summary,
contact map, Ramachandran plot, secondary-structure track, and residue inspector.
Use the cutoff slider to recompute contacts live, click a residue in the 3D view
/ plot / track to inspect it, and use the CSV / report buttons to export.

## Mathematical methods

All analyses skip missing atoms safely rather than crashing.

**Residue distances.** For residues *i* and *j* with Cα positions
**cᵢ**, **cⱼ**, the distance is the Euclidean norm
`dᵢⱼ = ‖cᵢ − cⱼ‖₂`. The full distance matrix is computed by broadcasting the
`(N, 3)` coordinate array against itself, giving a symmetric `(N, N)` matrix with
a zero diagonal.

**Contact map.** Residues *i* and *j* are in contact when `dᵢⱼ ≤ cutoff`
(default 8 Å); self-contacts on the diagonal are excluded. The unique contact
count is the number of `True` entries in the upper triangle.

**Backbone dihedrals (φ/ψ).** For residue *i*:

```
φ(i) = dihedral( C(i−1), N(i),  Cα(i), C(i)  )
ψ(i) = dihedral( N(i),   Cα(i), C(i),  N(i+1))
```

The dihedral of four points **p₀, p₁, p₂, p₃** is computed with the numerically
stable cross-product / `atan2` formulation. With bond vectors
**b₀ = p₀ − p₁**, **b₁ = p₂ − p₁**, **b₂ = p₃ − p₂**, we project **b₀** and
**b₂** onto the plane perpendicular to **b₁** and take:

```
x = v · w
y = (b₁ × v) · w        angle = atan2(y, x)
```

which yields a correctly-signed angle in (−180°, 180°]. φ is undefined for the
first residue of a chain and ψ for the last; angles are only computed across
peptide-bonded neighbors (author sequence numbers differing by 1) to avoid bogus
values across chain breaks.

**Secondary-structure estimate.** Each residue is assigned a raw state from its
(φ, ψ) Ramachandran basin (helix / sheet / coil), then runs shorter than a
minimum length (4 for helix, 3 for sheet) are demoted to coil. This is a simple,
fully explainable heuristic — **not** DSSP — and is labeled as an estimate
throughout the UI.

**Outlier flag.** A φ/ψ pair is flagged when it falls outside the recognized
basins and outside the generously-allowed border region — a coarse indicator,
not a validation-grade check.
