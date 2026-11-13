import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { analyzeHtml } from '../src/core/analyze';
import { SeoQuickError } from '../src/core/types';
import type { AnalysisError, AnalyzeResponse, ErrorCode } from '../src/core/types';
import {
  consumeAccess,
  createBillingContext,
  createBillingRouter,
  type BillingContext,
  type BillingUrls,
} from './billing';
import type { ServerConfig } from './config';
import { secureFetch } from './fetch/secureFetch';
import type { FetchDeps } from './fetch/secureFetch';
import { ConcurrencyGate, FixedWindowRateLimiter } from './http/rateLimit';

const HTTP_STATUS: Partial<Record<ErrorCode, number>> = {
  INVALID_URL: 400,
  UNSUPPORTED_PROTOCOL: 400,
  CREDENTIALS_IN_URL: 400,
  BLOCKED_HOST: 400,
  BLOCKED_PORT: 400,
  RATE_LIMITED: 429,
  BUSY: 503,
  LIVE_FETCH_DISABLED: 503,
  TIMEOUT: 504,
  QUOTA_EXCEEDED: 402,
  TOKEN_EXPIRED: 401,
  INTERNAL: 500,
};

/** Retour Stripe : page pré-rendue /abonnement/, l'identifiant de session est lu côté client. */
export const BILLING_URLS: BillingUrls = {
  success: (origin) => `${origin}/abonnement/?session_id={CHECKOUT_SESSION_ID}`,
  cancel: (origin) => `${origin}/#analyse`,
  portalReturn: (origin) => `${origin}/`,
};

/** Erreurs de facturation au format de l'API SEOQuick : `{ ok: false, error: { code, message } }`. */
export const billingErrorBody = (code: string, message: string, extra?: Record<string, unknown>) => ({
  ok: false,
  error: { code, message, ...extra },
});

function sendError(res: Response, error: AnalysisError): void {
  const body: AnalyzeResponse = { ok: false, error };
  res.status(HTTP_STATUS[error.code] ?? 502).json(body);
}

export interface AppOptions {
  config: ServerConfig;
  /** Dépendances réseau injectables (tests uniquement). */
  fetchDeps?: FetchDeps;
  staticDir?: string;
  /** Abonnement Stripe. Absent = accès libre (facturation désactivée). */
  billing?: BillingContext;
}

export function createApp({ config, fetchDeps, staticDir, billing: billingOption }: AppOptions) {
  const app = express();
  const billing =
    billingOption ??
    createBillingContext({ settings: null, freePerDay: 0, urls: BILLING_URLS, errorBody: billingErrorBody });
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const limiter = new FixedWindowRateLimiter(config.rateLimit.max, config.rateLimit.windowMs);
  const gate = new ConcurrencyGate(config.maxConcurrentFetches);
  setInterval(() => limiter.prune(), 60_000).unref();

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, liveFetch: config.enableLiveFetch });
  });

  app.post('/api/analyze', express.json({ limit: '4kb' }), async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');

    if (!config.enableLiveFetch)
      return sendError(res, {
        code: 'LIVE_FETCH_DISABLED',
        message: "L'analyse d'URL réelles est désactivée sur ce serveur. Le mode démo reste disponible.",
      });

    const decision = limiter.hit(req.ip ?? 'unknown');
    res.setHeader('RateLimit-Limit', String(config.rateLimit.max));
    res.setHeader('RateLimit-Remaining', String(decision.remaining));
    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSec));
      return sendError(res, {
        code: 'RATE_LIMITED',
        message: `Trop d'analyses en peu de temps. Réessayez dans ${decision.retryAfterSec} s.`,
        retryAfterSec: decision.retryAfterSec,
      });
    }

    const url: unknown = (req.body as { url?: unknown } | undefined)?.url;
    if (typeof url !== 'string') return sendError(res, { code: 'INVALID_URL', message: 'Veuillez fournir une URL.' });

    const release = gate.tryAcquire();
    if (!release)
      return sendError(res, { code: 'BUSY', message: 'Le service est très sollicité. Réessayez dans quelques secondes.' });

    // Quota gratuit / accès Pro, vérifié côté serveur. Une analyse en échec est remboursée.
    const access = consumeAccess(
      billing,
      req,
      res,
      () => "Vous avez utilisé vos analyses gratuites.",
    );
    if (!access) {
      release();
      return;
    }

    try {
      const page = await secureFetch(url, config.fetch, fetchDeps);
      const result = analyzeHtml(
        page.html,
        { pageUrl: page.finalUrl, xRobotsTag: page.xRobotsTag },
        {
          kind: 'live',
          requestedUrl: page.requestedUrl,
          finalUrl: page.finalUrl,
          httpStatus: page.status,
          redirects: page.redirects,
          contentType: page.contentType,
          bytes: page.bytes,
          fetchedAt: new Date().toISOString(),
        },
      );
      const body: AnalyzeResponse = { ok: true, result, access: access.access };
      res.json(body);
    } catch (e) {
      access.refund();
      if (e instanceof SeoQuickError) return sendError(res, e.info);
      console.error('[analyze] erreur inattendue', e);
      sendError(res, { code: 'INTERNAL', message: "Une erreur interne est survenue. Aucun résultat n'a été produit." });
    } finally {
      release();
    }
  });

  app.use('/api/billing', express.json({ limit: '4kb' }), createBillingRouter(billing));

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: { code: 'INVALID_URL', message: 'Route API inconnue.' } });
  });

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: 'index.html', maxAge: '1h', setHeaders: cacheAssets }));
    const notFound = path.join(staticDir, '404.html');
    app.use((_req, res) => {
      if (fs.existsSync(notFound)) res.status(404).sendFile(notFound);
      else res.status(404).send('Page introuvable');
    });
  }

  // Erreurs Express (JSON malformé, corps trop gros…) → objet structuré.
  app.use((error: { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (error?.type === 'entity.too.large')
      return sendError(res, { code: 'INVALID_URL', message: 'Requête trop volumineuse.' });
    if (error?.status === 400) return sendError(res, { code: 'INVALID_URL', message: 'Requête invalide (JSON attendu).' });
    console.error('[server] erreur', error);
    sendError(res, { code: 'INTERNAL', message: 'Erreur interne.' });
  });

  return app;
}

function cacheAssets(res: Response, filePath: string): void {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else res.setHeader('Cache-Control', 'public, max-age=300');
}
