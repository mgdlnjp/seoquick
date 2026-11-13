import type { AccessInfo } from './billing';

/**
 * Types partagés entre le serveur (analyse réelle) et le client (affichage + mode démo).
 * Aucune dépendance au DOM ni à Node : ce module doit rester portable.
 */

/** Statut d'un contrôle. Libellés FR dans `STATUS_LABELS`. */
export type CheckStatus = 'pass' | 'warn' | 'missing' | 'unverifiable';

export const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: 'Correct',
  warn: 'À améliorer',
  missing: 'Non détecté',
  unverifiable: 'Non vérifiable',
};

export type CheckId =
  | 'title'
  | 'metaDescription'
  | 'h1'
  | 'h2'
  | 'images'
  | 'canonical'
  | 'robots'
  | 'lang';

/** Données brutes extraites du HTML reçu (avant toute interprétation). */
export interface ExtractedData {
  titles: string[];
  metaDescriptions: string[];
  h1: string[];
  h2: string[];
  images: {
    total: number;
    missingAlt: number;
    emptyAlt: number;
    /** Quelques `src` d'images sans attribut alt (max 5), pour aider à les retrouver. */
    missingAltExamples: string[];
  };
  canonicals: string[];
  /** Contenu brut des balises meta robots / googlebot. */
  robotsMeta: { name: string; content: string }[];
  /** `href` de la balise <base>, si présente (sert à résoudre le canonical relatif). */
  baseHref: string | null;
  htmlLang: string | null;
  /** Indices permettant de signaler une page probablement rendue côté client. */
  signals: { visibleTextLength: number; scriptCount: number };
}

/** Contexte de la récupération, nécessaire à certaines règles. */
export interface AnalysisContext {
  /** URL finale après redirections (ou URL fictive en démo). */
  pageUrl: string;
  /** En-tête HTTP X-Robots-Tag ; `undefined` si non disponible (mode démo). */
  xRobotsTag?: string | null;
}

export interface Check {
  id: CheckId;
  label: string;
  status: CheckStatus;
  /** Résumé de la valeur trouvée, lisible. */
  summary: string;
  /** Données brutes utiles (valeurs exactes trouvées dans le HTML). */
  raw: string[];
  /** Pourquoi ce point compte. */
  why: string;
  /** Conseil concret lié au statut. */
  advice: string;
  points: number;
  maxPoints: number;
}

export interface ScoreBreakdownItem {
  id: CheckId;
  label: string;
  points: number;
  maxPoints: number;
  counted: boolean;
}

export interface Score {
  /** 0–100, arrondi. `null` si aucun contrôle n'est vérifiable. */
  value: number | null;
  earned: number;
  possible: number;
  breakdown: ScoreBreakdownItem[];
}

export type Impact = 'élevé' | 'moyen' | 'faible';
export type Effort = 'facile' | 'moyen' | 'plus long';

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  impact: Impact;
  effort: Effort;
  /** true pour une bonne pratique générale (pas liée à un défaut détecté). */
  generic: boolean;
}

export type AnalysisSource =
  | {
      kind: 'live';
      requestedUrl: string;
      finalUrl: string;
      httpStatus: number;
      redirects: string[];
      contentType: string | null;
      bytes: number;
      fetchedAt: string;
    }
  | { kind: 'demo'; label: string; pageUrl: string };

export interface AnalysisResult {
  source: AnalysisSource;
  extracted: ExtractedData;
  checks: Check[];
  score: Score;
  recommendations: Recommendation[];
  notices: string[];
}

export type ErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'CREDENTIALS_IN_URL'
  | 'BLOCKED_HOST'
  | 'BLOCKED_PORT'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'TOO_LARGE'
  | 'TOO_MANY_REDIRECTS'
  | 'HTTP_ERROR'
  | 'NOT_HTML'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'LIVE_FETCH_DISABLED'
  | 'PARSE_ERROR'
  | 'SERVER_UNREACHABLE'
  | 'QUOTA_EXCEEDED'
  | 'TOKEN_EXPIRED'
  | 'INTERNAL';

export interface AnalysisError {
  code: ErrorCode;
  message: string;
  details?: string;
  /** Pour HTTP_ERROR : code de statut reçu. */
  httpStatus?: number;
  /** Pour RATE_LIMITED : délai conseillé en secondes. */
  retryAfterSec?: number;
  /** Pour QUOTA_EXCEEDED : droits d'accès actuels. */
  access?: AccessInfo;
}

export type AnalyzeResponse =
  | { ok: true; result: AnalysisResult; access?: AccessInfo }
  | { ok: false; error: AnalysisError };

/** Erreur typée transportant un `AnalysisError` structuré. */
export class SeoQuickError extends Error {
  readonly info: AnalysisError;
  constructor(info: AnalysisError) {
    super(info.message);
    this.name = 'SeoQuickError';
    this.info = info;
  }
}
