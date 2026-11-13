import { useEffect, useRef } from 'react';
import { Ban, Clock, FileWarning, Globe, Play, RotateCcw, ServerCrash, ShieldAlert, Sparkles, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AnalysisError, ErrorCode } from '../core/types';
import { btn } from '../lib/cn';

const TITLES: Record<ErrorCode, string> = {
  INVALID_URL: 'Adresse invalide',
  UNSUPPORTED_PROTOCOL: 'Protocole non pris en charge',
  CREDENTIALS_IN_URL: 'Adresse refusée',
  BLOCKED_HOST: 'Adresse non autorisée',
  BLOCKED_PORT: 'Port non autorisé',
  DNS_FAILURE: 'Domaine introuvable',
  TIMEOUT: 'Délai dépassé',
  TOO_LARGE: 'Page trop volumineuse',
  TOO_MANY_REDIRECTS: 'Trop de redirections',
  HTTP_ERROR: 'Page inaccessible',
  NOT_HTML: 'Ce n’est pas une page HTML',
  NETWORK_ERROR: 'Erreur réseau',
  RATE_LIMITED: 'Trop de demandes',
  BUSY: 'Service occupé',
  LIVE_FETCH_DISABLED: 'Analyse réelle désactivée',
  PARSE_ERROR: 'Analyse impossible',
  SERVER_UNREACHABLE: 'Serveur injoignable',
  QUOTA_EXCEEDED: 'Analyses gratuites épuisées',
  TOKEN_EXPIRED: 'Accès à renouveler',
  INTERNAL: 'Erreur interne',
};

const ICONS: Partial<Record<ErrorCode, LucideIcon>> = {
  BLOCKED_HOST: ShieldAlert,
  BLOCKED_PORT: ShieldAlert,
  CREDENTIALS_IN_URL: ShieldAlert,
  DNS_FAILURE: Globe,
  TIMEOUT: Clock,
  RATE_LIMITED: Clock,
  BUSY: Clock,
  TOO_LARGE: FileWarning,
  NOT_HTML: FileWarning,
  PARSE_ERROR: FileWarning,
  NETWORK_ERROR: WifiOff,
  SERVER_UNREACHABLE: ServerCrash,
  INTERNAL: ServerCrash,
  LIVE_FETCH_DISABLED: Ban,
  QUOTA_EXCEEDED: Clock,
};

const OFFER_DEMO: ErrorCode[] = ['SERVER_UNREACHABLE', 'LIVE_FETCH_DISABLED', 'BUSY', 'INTERNAL', 'QUOTA_EXCEEDED'];
/** Erreurs passagères : relancer la même URL a du sens. */
const RETRYABLE: ErrorCode[] = ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMITED', 'BUSY', 'SERVER_UNREACHABLE', 'INTERNAL', 'HTTP_ERROR'];

export function ErrorPanel({
  error,
  onDemo,
  onRetry,
  onUpgrade,
}: {
  error: AnalysisError;
  onDemo: () => void;
  onRetry?: () => void;
  /** Affiche « Passer à Pro » quand le quota gratuit est atteint. */
  onUpgrade?: () => void;
}) {
  const Icon = ICONS[error.code] ?? FileWarning;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), [error]);

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="animate-fade-up mx-auto max-w-2xl overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-card outline-none"
    >
      <div className="flex gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-rose-700 uppercase">
            {error.code === 'HTTP_ERROR' && error.httpStatus ? `HTTP ${error.httpStatus}` : 'Analyse interrompue'}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-ink-950">{TITLES[error.code] ?? 'Erreur'}</p>
          <p className="mt-1.5 text-[15px] text-ink-700">{error.message}</p>
          {error.code === 'RATE_LIMITED' && error.retryAfterSec !== undefined && (
            <p className="mt-1.5 text-sm text-ink-600">Vous pourrez relancer dans environ {error.retryAfterSec} s.</p>
          )}
          {error.details && (
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs break-words text-ink-600 ring-1 ring-ink-200/70">
              Détail technique : {error.details}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">Aucun score n’est affiché : sans HTML analysable, SEOQuick ne peut rien conclure.</p>
        <div className="flex shrink-0 gap-2">
          {OFFER_DEMO.includes(error.code) && (
            <button type="button" onClick={onDemo} className={btn('outline', 'sm')}>
              <Play aria-hidden="true" className="h-3.5 w-3.5" /> Voir la démo
            </button>
          )}
          {onUpgrade && error.code === 'QUOTA_EXCEEDED' && (
            <button type="button" onClick={onUpgrade} className={btn('dark', 'sm')}>
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Passer à Pro
            </button>
          )}
          {onRetry && RETRYABLE.includes(error.code) && (
            <button type="button" onClick={onRetry} className={btn('dark', 'sm')}>
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
