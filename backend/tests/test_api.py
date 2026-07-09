"""End-to-end API tests via Starlette's TestClient.

Covers the sample-load pipeline, file upload (good + bad), downloads, and
error handling paths the frontend relies on.
"""

import io

import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)

# A tiny but valid two-residue PDB.
GOOD_PDB = b"""\
ATOM      1  N   ALA A   1      0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   1      1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   1      2.009   1.420   0.000  1.00  0.00           C
ATOM      4  O   ALA A   1      1.251   2.390   0.000  1.00  0.00           O
ATOM      5  N   GLY A   2      3.332   1.552   0.000  1.00  0.00           N
ATOM      6  CA  GLY A   2      3.999   2.845   0.000  1.00  0.00           C
ATOM      7  C   GLY A   2      5.510   2.680   0.000  1.00  0.00           C
ATOM      8  O   GLY A   2      6.009   1.550   0.000  1.00  0.00           O
END
"""


def _upload(content: bytes, filename: str):
    return client.post(
        "/api/structures/upload",
        files={"file": (filename, io.BytesIO(content), "chemical/x-pdb")},
    )


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_samples_listed():
    ids = [s["id"] for s in client.get("/api/samples").json()["samples"]]
    assert {"1crn", "1ubq", "1l2y"} <= set(ids)


def test_sample_download():
    r = client.get("/api/samples/1crn/download")
    assert r.status_code == 200
    assert "ATOM" in r.text
    assert "attachment" in r.headers["content-disposition"]


def test_full_sample_pipeline():
    r = client.post("/api/structures/sample/1crn")
    assert r.status_code == 200
    body = r.json()
    sid = body["id"]
    assert body["filename"] == "1CRN.pdb"
    assert body["summary"]["n_residues"] == 46

    assert client.get(f"/api/structures/{sid}/pdb").text.startswith("HEADER")
    con = client.get(f"/api/structures/{sid}/contacts?cutoff=8").json()
    assert con["n_contacts"] > 0
    ram = client.get(f"/api/structures/{sid}/ramachandran").json()
    assert ram["n_defined"] > 0
    res = client.get(f"/api/structures/{sid}/residue/5").json()
    assert res["chain"] == "A"

    # Downloads
    assert client.get(f"/api/structures/{sid}/contacts.csv").status_code == 200
    assert client.get(f"/api/structures/{sid}/ramachandran.csv").status_code == 200
    rep = client.get(f"/api/structures/{sid}/report?cutoff=8")
    assert rep.status_code == 200
    assert rep.headers["content-type"] == "application/zip"


def test_upload_good_file_carries_filename():
    r = _upload(GOOD_PDB, "my_protein.pdb")
    assert r.status_code == 200
    body = r.json()
    assert body["filename"] == "my_protein.pdb"
    assert body["summary"]["n_residues"] == 2


def test_upload_wrong_extension_rejected():
    r = _upload(GOOD_PDB, "protein.csv")
    assert r.status_code == 400


def test_upload_empty_file_rejected():
    r = _upload(b"", "empty.pdb")
    assert r.status_code == 422


def test_upload_garbage_pdb_rejected():
    r = _upload(b"this is not a protein\n", "junk.pdb")
    assert r.status_code == 422


def test_unknown_structure_and_sample_404():
    assert client.get("/api/structures/nope/summary").status_code == 404
    assert client.post("/api/structures/sample/9zzz").status_code == 404


@pytest.mark.parametrize("cutoff", [4.0, 8.0, 12.0])
def test_cutoff_bounds_accepted(cutoff):
    sid = client.post("/api/structures/sample/1crn").json()["id"]
    r = client.get(f"/api/structures/{sid}/contacts?cutoff={cutoff}")
    assert r.status_code == 200
