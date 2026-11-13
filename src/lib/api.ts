import type { AnalysisError, AnalyzeResponse } from '../core/types';
import { authHeaders, ensureFreshToken, refreshToken, setToken } from './billing';

/** `true` pour un build statique sans API (seul le mode démo fonctionne). */
export const DEMO_ONLY = import.meta.env.VITE_DEMO_ONLY === 'true';

const CLIENT_TIMEOUT_MS = 30_000;

function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false;
  const v = value as { ok: unknown; result?: unknown; error?: { code?: unknown; message?: unknown } };
  if (v.ok === true) return typeof v.result === 'object' && v.result !== null;
  return v.ok === false && typeof v.error?.code === 'string' && typeof v.error?.message === 'string';
}

const unreachable = (details?: string): AnalyzeResponse => ({
  ok: false,
  error: {
    code: 'SERVER_UNREACHABLE',
    message: 'Le serveur d’analyse est injoignable. Vérifiez votre connexion ou essayez le mode démo.',
    details,
  } satisfies AnalysisError,
});

/** Appelle l'API. Ne lève jamais (sauf annulation volontaire) : renvoie un objet structuré. */
export async function requestAnalysis(url: string, signal?: AbortSignal, retried = false): Promise<AnalyzeResponse> {
  if (DEMO_ONLY)
    return {
      ok: false,
      error: { code: 'LIVE_FETCH_DISABLED', message: 'Cette version de SEOQuick fonctionne uniquement en mode démo.' },
    };

  await ensureFreshToken();
  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ url }),
      signal: combined,
      credentials: 'omit',
    });
  } catch (e) {
    if (signal?.aborted) throw e; // annulation volontaire : gérée par l'appelant
    if (timeout.aborted)
      return { ok: false, error: { code: 'TIMEOUT', message: 'L’analyse a pris trop de temps. Réessayez dans un instant.' } };
    return unreachable(e instanceof Error ? e.message : undefined);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return unreachable(`Réponse non JSON (HTTP ${response.status})`);
  }
  if (!isAnalyzeResponse(body)) return unreachable('Réponse inattendue du serveur');
  // Accès Pro expiré : on renouvelle le jeton (ou on l'abandonne) puis on réessaie une fois.
  if (!body.ok && body.error.code === 'TOKEN_EXPIRED' && !retried) {
    if (!(await refreshToken())) setToken(null);
    return requestAnalysis(url, signal, true);
  }
  return body;
}
