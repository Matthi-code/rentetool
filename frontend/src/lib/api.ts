/**
 * API client for Rentetool backend with Supabase auth
 */

import type {
  Case,
  CaseCreate,
  CaseWithLines,
  Vordering,
  VorderingCreate,
  Deelbetaling,
  DeelbetalingCreate,
  BerekeningResponse,
  Snapshot,
} from './types';
import { createClient } from './supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login on auth error
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Not authenticated');
    }
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }

  return response.json();
}

// Cases API

export async function getCases(): Promise<Case[]> {
  return fetchApi<Case[]>('/api/cases');
}

export async function getCase(id: string): Promise<CaseWithLines> {
  return fetchApi<CaseWithLines>(`/api/cases/${id}`);
}

export async function createCase(data: CaseCreate): Promise<Case> {
  return fetchApi<Case>('/api/cases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCase(id: string, data: CaseCreate): Promise<Case> {
  return fetchApi<Case>(`/api/cases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCase(id: string): Promise<void> {
  await fetchApi(`/api/cases/${id}`, { method: 'DELETE' });
}

// Vorderingen API

export async function createVordering(
  caseId: string,
  data: VorderingCreate
): Promise<Vordering> {
  return fetchApi<Vordering>(`/api/cases/${caseId}/vorderingen`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVordering(
  id: string,
  data: VorderingCreate
): Promise<Vordering> {
  return fetchApi<Vordering>(`/api/cases/vorderingen/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVordering(id: string): Promise<void> {
  await fetchApi(`/api/cases/vorderingen/${id}`, { method: 'DELETE' });
}

// Deelbetalingen API

export async function createDeelbetaling(
  caseId: string,
  data: DeelbetalingCreate
): Promise<Deelbetaling> {
  return fetchApi<Deelbetaling>(`/api/cases/${caseId}/deelbetalingen`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDeelbetaling(
  id: string,
  data: DeelbetalingCreate
): Promise<Deelbetaling> {
  return fetchApi<Deelbetaling>(`/api/cases/deelbetalingen/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDeelbetaling(id: string): Promise<void> {
  await fetchApi(`/api/cases/deelbetalingen/${id}`, { method: 'DELETE' });
}

// Berekening API

export async function berekenRente(
  caseData: CaseWithLines
): Promise<BerekeningResponse> {
  const request = {
    einddatum: caseData.einddatum,
    strategie: caseData.strategie,
    vorderingen: caseData.vorderingen.map((v) => ({
      kenmerk: v.kenmerk,
      bedrag: v.bedrag,
      datum: v.datum,
      rentetype: v.rentetype,
      kosten: v.kosten,
      opslag: v.opslag,
      opslag_ingangsdatum: v.opslag_ingangsdatum,
    })),
    deelbetalingen: caseData.deelbetalingen.map((d) => ({
      kenmerk: d.kenmerk,
      bedrag: d.bedrag,
      datum: d.datum,
      aangewezen: d.aangewezen,
    })),
  };

  return fetchApi<BerekeningResponse>('/api/bereken', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Snapshots API

export async function getSnapshots(caseId: string): Promise<Snapshot[]> {
  return fetchApi<Snapshot[]>(`/api/snapshots/case/${caseId}`);
}

export async function createSnapshot(caseId: string): Promise<Snapshot> {
  return fetchApi<Snapshot>(`/api/snapshots/case/${caseId}`, {
    method: 'POST',
  });
}

export async function getSnapshotPdf(snapshotId: string): Promise<Blob> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/snapshots/${snapshotId}/pdf`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Not authenticated');
    }
    throw new ApiError(response.status, 'Failed to download PDF');
  }

  return response.blob();
}

// Rentetabel API

export interface RenteTabelEntry {
  datum: string;
  wettelijk: number;
  handels: number;
}

export async function getRentetabel(): Promise<RenteTabelEntry[]> {
  return fetchApi<RenteTabelEntry[]>('/api/rentetabel');
}
