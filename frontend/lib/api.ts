// Typed client for the Helix FastAPI backend.

import type {
  ContactData,
  LoadResponse,
  RamachandranData,
  ResidueDetail,
  SecondaryData,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the Helix backend. Is the API server running on port 8000?"
    );
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<LoadResponse>("/api/structures/upload", {
      method: "POST",
      body: form,
    });
  },

  pdbText: async (sid: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/api/structures/${sid}/pdb`);
    if (!res.ok) throw new ApiError(res.status, "Could not fetch coordinates.");
    return res.text();
  },

  contacts: (sid: string, cutoff: number) =>
    request<ContactData>(
      `/api/structures/${sid}/contacts?cutoff=${cutoff}`
    ),

  ramachandran: (sid: string) =>
    request<RamachandranData>(`/api/structures/${sid}/ramachandran`),

  secondary: (sid: string) =>
    request<SecondaryData>(`/api/structures/${sid}/secondary`),

  residue: (sid: string, index: number) =>
    request<ResidueDetail>(`/api/structures/${sid}/residue/${index}`),

  // File-download URLs (used directly as hrefs).
  contactsCsvUrl: (sid: string, cutoff: number, matrix = false) =>
    `${API_BASE}/api/structures/${sid}/contacts.csv?cutoff=${cutoff}&matrix=${matrix}`,

  ramachandranCsvUrl: (sid: string) =>
    `${API_BASE}/api/structures/${sid}/ramachandran.csv`,

  reportUrl: (sid: string, cutoff: number) =>
    `${API_BASE}/api/structures/${sid}/report?cutoff=${cutoff}`,
};

// Consistent chain colors shared by the 3D viewer and 2D plots — bright,
// saturated hues tuned to read cleanly on the dark canvas.
export const CHAIN_COLORS = [
  "#34e5d4",
  "#8a7cff",
  "#f6c453",
  "#ff7eb6",
  "#5ad06a",
  "#5aa9ff",
  "#ff9f6b",
  "#c792ff",
];

export function chainColor(chainId: string, chainIds: string[]): string {
  const i = Math.max(0, chainIds.indexOf(chainId));
  return CHAIN_COLORS[i % CHAIN_COLORS.length];
}

export const SS_COLORS: Record<string, string> = {
  helix: "#8a7cff",
  sheet: "#34e5d4",
  coil: "#6b7488",
};
