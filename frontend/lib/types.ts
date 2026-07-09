// Shared API types — mirror the FastAPI backend responses.

export interface SampleMeta {
  id: string;
  name: string;
  pdb_id: string;
  description: string;
}

export interface ChainInfo {
  id: string;
  length: number;
  n_residues: number;
}

export interface MissingBackbone {
  residue: string;
  index: number;
  missing: string[];
}

export interface StructureHeader {
  name: string;
  idcode: string;
  resolution: number | null;
  structure_method: string;
}

export interface StructureSummary {
  name: string;
  header: StructureHeader;
  n_chains: number;
  n_residues: number;
  n_atoms: number;
  chains: ChainInfo[];
  composition: Record<string, number>;
  missing_backbone: MissingBackbone[];
  n_missing_backbone: number;
}

export interface LoadResponse {
  id: string;
  source: string;
  filename: string;
  summary: StructureSummary;
}

export interface ContactData {
  labels: string[];
  indices: number[];
  chains: string[];
  cutoff: number;
  n_residues: number;
  n_contacts: number;
  distance_matrix: (number | null)[][];
  contact_matrix: boolean[][];
}

export type RamaRegion =
  | "alpha"
  | "beta"
  | "left_alpha"
  | "other"
  | "undefined";

export interface RamaRow {
  index: number;
  residue: string;
  one_letter: string;
  seq: number;
  chain: string;
  label: string;
  phi: number | null;
  psi: number | null;
  region: RamaRegion;
  outlier: boolean;
}

export interface RamachandranData {
  rows: RamaRow[];
  n_residues: number;
  n_defined: number;
  n_outliers: number;
}

export type SSType = "helix" | "sheet" | "coil";

export interface SSResidue {
  index: number;
  label: string;
  chain: string;
  seq: number;
  ss: SSType;
}

export interface SecondaryData {
  per_residue: SSResidue[];
  counts: Record<SSType, number>;
  fractions: Record<SSType, number>;
  method: string;
  note: string;
}

export interface NeighborInfo {
  label: string;
  index: number;
  chain: string;
  distance: number;
}

export interface ResidueDetail {
  index: number;
  name: string;
  one_letter: string;
  seq: number;
  icode: string;
  chain: string;
  is_amino: boolean;
  label: string;
  coord: [number, number, number] | null;
  atoms: string[];
  missing_backbone: string[];
  neighbors: NeighborInfo[];
  phi: number | null;
  psi: number | null;
  ss: SSType;
}
