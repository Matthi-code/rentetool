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
  Colleague,
  CaseShare,
  SubscriptionTier,
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

export async function getCases(filter?: 'own' | 'shared'): Promise<Case[]> {
  const params = filter ? `?filter=${filter}` : '';
  return fetchApi<Case[]>(`/api/cases${params}`);
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
      item_type: v.item_type || 'vordering',
      kenmerk: v.kenmerk,
      bedrag: v.bedrag,
      datum: v.datum,
      rentetype: v.rentetype,
      kosten: v.kosten,
      kosten_rentedatum: v.kosten_rentedatum,
      opslag: v.opslag,
      opslag_ingangsdatum: v.opslag_ingangsdatum,
      pauze_start: v.pauze_start,
      pauze_eind: v.pauze_eind,
      betaaltermijn_dagen: v.betaaltermijn_dagen || 0,
      bodemrente: v.bodemrente,
      kosten_categorie: v.kosten_categorie,
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

// Usage Tracking API

export interface UsageLogCreate {
  action_type: 'calculation' | 'pdf_view';
  case_id?: string;
  case_name?: string;
}

export interface UsageStats {
  total_calculations: number;
  total_pdf_views: number;
  last_calculation: string | null;
  last_pdf_view: string | null;
}

export async function logUsage(data: UsageLogCreate): Promise<void> {
  try {
    await fetchApi('/api/usage/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Don't throw on usage logging errors - it's not critical
    console.warn('Failed to log usage:', error);
  }
}

export async function getUsageStats(): Promise<UsageStats> {
  return fetchApi<UsageStats>('/api/usage/stats');
}

// Sharing API

export interface ColleagueCountResponse {
  count: number;
  domain: string | null;
}

export async function getColleagues(): Promise<Colleague[]> {
  return fetchApi<Colleague[]>('/api/sharing/colleagues');
}

export async function getColleagueCount(): Promise<ColleagueCountResponse> {
  return fetchApi<ColleagueCountResponse>('/api/sharing/colleagues/count');
}

export async function shareCase(
  caseId: string,
  data: { shared_with_user_id: string; permission: 'view' | 'edit' }
): Promise<CaseShare> {
  return fetchApi<CaseShare>(`/api/sharing/cases/${caseId}/share`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function unshareCase(caseId: string, userId: string): Promise<void> {
  await fetchApi(`/api/sharing/cases/${caseId}/share/${userId}`, {
    method: 'DELETE',
  });
}

export async function getCaseShares(caseId: string): Promise<CaseShare[]> {
  return fetchApi<CaseShare[]>(`/api/sharing/cases/${caseId}/shares`);
}

export async function updateSharePermission(
  caseId: string,
  userId: string,
  permission: 'view' | 'edit'
): Promise<void> {
  await fetchApi(`/api/sharing/cases/${caseId}/share/${userId}?permission=${permission}`, {
    method: 'PATCH',
  });
}

export async function leaveSharedCase(caseId: string): Promise<void> {
  await fetchApi(`/api/sharing/cases/${caseId}/leave`, {
    method: 'DELETE',
  });
}

// Subscription API

export async function getMyTier(): Promise<SubscriptionTier> {
  try {
    return await fetchApi<SubscriptionTier>('/api/subscription/me');
  } catch {
    // Fallback to free tier if subscription service not available
    return {
      tier_id: 'free',
      naam: 'Starter',
      max_vorderingen: 3,
      max_deelbetalingen: 1,
      mag_opslaan: false,
      mag_pdf_schoon: false,
      mag_snapshots: false,
      mag_sharing: false,
      mag_pauze: false,
    };
  }
}

export async function berekenRentePdf(
  caseData: CaseWithLines
): Promise<Blob> {
  const token = await getAuthToken();

  const request = {
    einddatum: caseData.einddatum,
    strategie: caseData.strategie,
    vorderingen: caseData.vorderingen.map((v) => ({
      item_type: v.item_type || 'vordering',
      kenmerk: v.kenmerk,
      bedrag: v.bedrag,
      datum: v.datum,
      rentetype: v.rentetype,
      kosten: v.kosten,
      kosten_rentedatum: v.kosten_rentedatum,
      opslag: v.opslag,
      opslag_ingangsdatum: v.opslag_ingangsdatum,
      pauze_start: v.pauze_start,
      pauze_eind: v.pauze_eind,
      betaaltermijn_dagen: v.betaaltermijn_dagen || 0,
      bodemrente: v.bodemrente,
      kosten_categorie: v.kosten_categorie,
    })),
    deelbetalingen: caseData.deelbetalingen.map((d) => ({
      kenmerk: d.kenmerk,
      bedrag: d.bedrag,
      datum: d.datum,
      aangewezen: d.aangewezen,
    })),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/bereken/pdf`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'Failed to generate PDF');
  }

  return response.blob();
}

// Excel Export API

export async function berekenRenteExcel(
  caseData: CaseWithLines
): Promise<Blob> {
  const token = await getAuthToken();

  const request = {
    einddatum: caseData.einddatum,
    strategie: caseData.strategie,
    vorderingen: caseData.vorderingen.map((v) => ({
      item_type: v.item_type || 'vordering',
      kenmerk: v.kenmerk,
      bedrag: v.bedrag,
      datum: v.datum,
      rentetype: v.rentetype,
      kosten: v.kosten,
      kosten_rentedatum: v.kosten_rentedatum,
      opslag: v.opslag,
      opslag_ingangsdatum: v.opslag_ingangsdatum,
      pauze_start: v.pauze_start,
      pauze_eind: v.pauze_eind,
      betaaltermijn_dagen: v.betaaltermijn_dagen || 0,
      bodemrente: v.bodemrente,
      kosten_categorie: v.kosten_categorie,
    })),
    deelbetalingen: caseData.deelbetalingen.map((d) => ({
      kenmerk: d.kenmerk,
      bedrag: d.bedrag,
      datum: d.datum,
      aangewezen: d.aangewezen,
    })),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/bereken/excel`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new ApiError(403, 'Excel export is een Pro-functie');
    }
    throw new ApiError(response.status, 'Failed to generate Excel');
  }

  return response.blob();
}

// Admin API

export interface AdminStats {
  total_users: number;
  total_cases: number;
  total_calculations: number;
  total_pdf_views: number;
}

export interface UserStats {
  id: string;
  email: string;
  display_name: string | null;
  email_domain: string;
  created_at: string;
  roles: string[];
  cases_count: number;
  shared_with_count: number;
  calculations_count: number;
  pdf_views_count: number;
  last_activity: string | null;
}

export interface AdminCheckResponse {
  is_admin: boolean;
  is_org_admin: boolean;
  roles: string[];
  domain: string | null;
}

export async function checkAdmin(): Promise<AdminCheckResponse> {
  try {
    return await fetchApi<AdminCheckResponse>('/api/admin/check');
  } catch {
    return { is_admin: false, is_org_admin: false, roles: [], domain: null };
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  return fetchApi<AdminStats>('/api/admin/stats');
}

export async function getAdminUsers(): Promise<UserStats[]> {
  return fetchApi<UserStats[]>('/api/admin/users');
}

export interface AdminCase {
  id: string;
  naam: string;
  klant_referentie: string | null;
  einddatum: string;
  owner_email: string;
  vorderingen_count: number;
  deelbetalingen_count: number;
  created_at: string;
}

export async function getAdminCases(): Promise<AdminCase[]> {
  return fetchApi<AdminCase[]>('/api/admin/cases');
}

export interface AdminUsageLog {
  id: string;
  user_email: string;
  user_domain: string | null;
  action_type: 'calculation' | 'pdf_view';
  case_id: string | null;
  case_name: string | null;
  created_at: string;
}

export async function getAdminUsageLogs(): Promise<AdminUsageLog[]> {
  return fetchApi<AdminUsageLog[]>('/api/admin/usage-logs');
}

// Role Management API

export type UserRole = 'admin' | 'org_admin' | 'user';

export async function getUserRoles(userId: string): Promise<string[]> {
  return fetchApi<string[]>(`/api/admin/users/${userId}/roles`);
}

export async function assignRole(userId: string, role: UserRole): Promise<{ message: string; success: boolean }> {
  return fetchApi(`/api/admin/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function removeRole(userId: string, role: string): Promise<{ message: string; success: boolean }> {
  return fetchApi(`/api/admin/users/${userId}/roles/${role}`, {
    method: 'DELETE',
  });
}

// Case Transfer API

export async function transferCase(caseId: string): Promise<{ message: string; success: boolean; previous_owner_id?: string }> {
  return fetchApi(`/api/admin/cases/${caseId}/transfer`, {
    method: 'POST',
  });
}

// Domain Statistics API

export interface DomainStats {
  domain: string;
  is_consumer: boolean;
  users_count: number;
  cases_count: number;
  calculations_count: number;
  pdf_views_count: number;
  has_org_admin: boolean;
}

export interface DomainOverview {
  total_domains: number;
  organization_domains: number;
  consumer_domains: number;
  domains: DomainStats[];
}

export async function getDomainStats(): Promise<DomainOverview> {
  return fetchApi<DomainOverview>('/api/admin/domains');
}

export async function getConsumerDomains(): Promise<{ domains: string[] }> {
  return fetchApi<{ domains: string[] }>('/api/admin/consumer-domains');
}

// Admin Rentetabel API

export interface AdminRenteTabelEntry {
  id: string;
  ingangsdatum: string;
  percentage: number;
  created_at?: string;
  updated_at?: string;
}

export async function getAdminRentetabelWettelijk(): Promise<AdminRenteTabelEntry[]> {
  return fetchApi<AdminRenteTabelEntry[]>('/api/admin/rentetabel/wettelijk');
}

export async function getAdminRentetabelHandels(): Promise<AdminRenteTabelEntry[]> {
  return fetchApi<AdminRenteTabelEntry[]>('/api/admin/rentetabel/handels');
}

export async function createRentetabelWettelijk(data: { ingangsdatum: string; percentage: number }): Promise<AdminRenteTabelEntry> {
  return fetchApi<AdminRenteTabelEntry>('/api/admin/rentetabel/wettelijk', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createRentetabelHandels(data: { ingangsdatum: string; percentage: number }): Promise<AdminRenteTabelEntry> {
  return fetchApi<AdminRenteTabelEntry>('/api/admin/rentetabel/handels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRentetabelWettelijk(id: string, data: { percentage: number }): Promise<AdminRenteTabelEntry> {
  return fetchApi<AdminRenteTabelEntry>(`/api/admin/rentetabel/wettelijk/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateRentetabelHandels(id: string, data: { percentage: number }): Promise<AdminRenteTabelEntry> {
  return fetchApi<AdminRenteTabelEntry>(`/api/admin/rentetabel/handels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRentetabelWettelijk(id: string): Promise<void> {
  await fetchApi(`/api/admin/rentetabel/wettelijk/${id}`, { method: 'DELETE' });
}

export async function deleteRentetabelHandels(id: string): Promise<void> {
  await fetchApi(`/api/admin/rentetabel/handels/${id}`, { method: 'DELETE' });
}

// View as User API (Admin only)

export interface ViewAsUserProfile {
  id: string;
  email: string;
  display_name: string | null;
  email_domain: string;
  created_at: string;
  roles: string[];
}

export interface ViewAsUserCase {
  id: string;
  naam: string;
  klant_referentie: string | null;
  einddatum: string;
  strategie: string;
  vorderingen_count: number;
  deelbetalingen_count: number;
  created_at: string;
  updated_at: string;
}

export interface ViewAsUserResponse {
  user: ViewAsUserProfile;
  cases: ViewAsUserCase[];
  stats: {
    calculations_count: number;
    pdf_views_count: number;
    cases_count: number;
  };
}

export async function viewAsUser(userId: string): Promise<ViewAsUserResponse> {
  return fetchApi<ViewAsUserResponse>(`/api/admin/view-as-user/${userId}`);
}

// Admin Subscription Management API

export interface AdminSubscriptionTier {
  id: string;
  naam: string;
  max_vorderingen: number | null;
  max_deelbetalingen: number | null;
  mag_opslaan: boolean;
  mag_pdf_schoon: boolean;
  mag_snapshots: boolean;
  mag_sharing: boolean;
  prijs_per_maand: number | null;
  actief: boolean;
}

export interface AdminUserSubscription {
  user_id: string;
  email: string;
  display_name: string | null;
  tier_id: string;
  tier_naam: string;
  status: string;
  start_datum: string | null;
  toegekend_door_email: string | null;
}

export interface SubscriptionStats {
  total_free: number;
  total_pro: number;
  total_enterprise: number;
}

export async function getAdminSubscriptionTiers(): Promise<AdminSubscriptionTier[]> {
  return fetchApi<AdminSubscriptionTier[]>('/api/admin/subscriptions/tiers');
}

export async function updateAdminSubscriptionTier(
  tierId: string,
  data: Partial<AdminSubscriptionTier>
): Promise<{ message: string; success: boolean }> {
  return fetchApi(`/api/admin/subscriptions/tiers/${tierId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getAdminUserSubscriptions(): Promise<AdminUserSubscription[]> {
  return fetchApi<AdminUserSubscription[]>('/api/admin/subscriptions/users');
}

export async function assignSubscription(
  userId: string,
  tierId: string,
  notitie?: string
): Promise<{ message: string; success: boolean }> {
  return fetchApi('/api/admin/subscriptions/assign', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, tier_id: tierId, notitie }),
  });
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  return fetchApi<SubscriptionStats>('/api/admin/subscriptions/stats');
}
