/**
 * TypeScript types for Rentetool
 */

// API Types

export interface Vordering {
  id: string;
  kenmerk: string;
  bedrag: number;
  datum: string;
  rentetype: number;
  kosten: number;
  opslag?: number;
  opslag_ingangsdatum?: string;
}

export interface VorderingCreate {
  kenmerk: string;
  bedrag: number;
  datum: string;
  rentetype: number;
  kosten: number;
  opslag?: number;
  opslag_ingangsdatum?: string;
}

export interface Deelbetaling {
  id: string;
  kenmerk?: string;
  bedrag: number;
  datum: string;
  aangewezen: string[];
}

export interface DeelbetalingCreate {
  kenmerk?: string;
  bedrag: number;
  datum: string;
  aangewezen: string[];
}

export interface Case {
  id: string;
  naam: string;
  klant_referentie?: string;
  einddatum: string;
  strategie: 'A' | 'B';
  created_at: string;
  updated_at: string;
}

export interface CaseCreate {
  naam: string;
  klant_referentie?: string;
  einddatum: string;
  strategie: 'A' | 'B';
}

export interface CaseWithLines extends Case {
  vorderingen: Vordering[];
  deelbetalingen: Deelbetaling[];
}

// Calculation Types

export interface Periode {
  start: string;
  eind: string;
  dagen: number;
  hoofdsom: number;
  rente_pct: number;
  rente: number;
  is_kapitalisatie: boolean;
}

export interface Toerekening {
  vordering: string;
  type: 'kosten' | 'rente' | 'hoofdsom';
  bedrag: number;
}

export interface VorderingResultaat {
  kenmerk: string;
  oorspronkelijk_bedrag: number;
  kosten: number;
  totale_rente: number;
  afgelost_hoofdsom: number;
  afgelost_kosten: number;
  afgelost_rente: number;
  openstaand: number;
  status: 'OPEN' | 'VOLDAAN';
  voldaan_datum?: string;
  periodes: Periode[];
}

export interface DeelbetalingResultaat {
  kenmerk?: string;
  bedrag: number;
  datum: string;
  verwerkt: number;
  toerekeningen: Toerekening[];
}

export interface Totalen {
  oorspronkelijk: number;
  kosten: number;
  rente: number;
  afgelost_hoofdsom: number;
  afgelost_kosten: number;
  afgelost_rente: number;
  openstaand: number;
}

export interface BerekeningResponse {
  einddatum: string;
  strategie: string;
  vorderingen: VorderingResultaat[];
  deelbetalingen: DeelbetalingResultaat[];
  totalen: Totalen;
  controle_ok: boolean;
}

export interface Snapshot {
  id: string;
  created_at: string;
  einddatum: string;
  totaal_openstaand: number;
}

// UI Types

export const RENTETYPE_LABELS: Record<number, string> = {
  1: 'Wettelijk samengesteld (art. 6:119 BW)',
  2: 'Handelsrente samengesteld (art. 6:119a BW)',
  3: 'Wettelijk enkelvoudig',
  4: 'Handelsrente enkelvoudig',
  5: 'Contractueel vast percentage',
  6: 'Wettelijk + opslag',
  7: 'Handelsrente + opslag',
};

export const RENTETYPE_SHORT: Record<number, string> = {
  1: 'Wettelijk',
  2: 'Handels',
  3: 'Wett. enkel',
  4: 'Hand. enkel',
  5: 'Contract.',
  6: 'Wett. +',
  7: 'Hand. +',
};

export const STRATEGIE_LABELS: Record<string, string> = {
  A: 'A - Meest bezwarend (art. 6:43 BW)',
  B: 'B - Oudste eerst',
};
