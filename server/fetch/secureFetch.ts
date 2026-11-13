import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { Socket } from 'node:net';
import zlib from 'node:zlib';
import type { Readable } from 'node:stream';
import { bareHostname, validateUserUrl } from '../../src/core/urlValidation';
import { SeoQuickError } from '../../src/core/types';
import type { AnalysisError } from '../../src/core/types';
import { isPublicIp } from './ipPolicy';

/**
 * Récupération sécurisée d'UNE page HTML publique.
 *
 * Protections :
 *  - http/https uniquement, pas d'identifiants dans l'URL, ports en liste blanche ;
 *  - résolution DNS dans un `lookup` personnalisé : TOUTES les adresses résolues
 *    doivent être publiques, et c'est l'adresse validée qui est utilisée pour la
 *    connexion (pas de seconde résolution → pas de DNS rebinding) ;
 *  - IP littérales vérifiées avant connexion, adresse distante revérifiée à la connexion ;
 *  - redirections suivies manuellement, chaque saut entièrement revalidé, nombre limité ;
 *  - délai global + délai d'inactivité socket ; taille limitée APRÈS décompression ;
 *  - aucun cookie, aucun en-tête d'authentification, pas d'agent keep-alive partagé,
 *    pas de proxy d'environnement.
 */

export interface FetchConfig {
  timeoutMs: number;
  socketTimeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  userAgent: string;
  allowedPorts: readonly number[];
}

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  redirects: string[];
  contentType: string | null;
  xRobotsTag: string | null;
  /** Taille du corps décompressé, en octets. */
  bytes: number;
  html: string;
}

export type LookupFn = typeof dns.lookup;

/** Dépendances injectables (tests uniquement). */
export interface FetchDeps {
  resolver?: LookupFn;
  isAllowedIp?: (ip: string) => boolean;
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer | null;
}

const err = (info: AnalysisError) => new SeoQuickError(info);

/**
 * Crée une fonction `lookup` compatible net/http qui refuse toute résolution
 * contenant une adresse non publique.
 */
export function createSafeLookup(resolve: LookupFn = dns.lookup, isAllowedIp: (ip: string) => boolean = isPublicIp) {
  return function safeLookup(
    hostname: string,
    options: dns.LookupOptions,
    callback: (e: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
  ): void {
    resolve(hostname, { ...options, all: true }, (lookupErr, addresses) => {
      if (lookupErr) return callback(lookupErr, '');
      const list = (addresses as unknown as dns.LookupAddress[]) ?? [];
      if (list.length === 0) {
        const e: NodeJS.ErrnoException = new Error(`Aucune adresse pour ${hostname}`);
        e.code = 'ENOTFOUND';
        return callback(e, '');
      }
      const blocked = list.find((a) => !isAllowedIp(a.address));
      if (blocked) {
        return callback(
          err({
            code: 'BLOCKED_HOST',
            message: 'Ce domaine pointe vers une adresse IP privée, locale ou réservée : il ne peut pas être analysé.',
          }),
          '',
        );
      }
      if (options.all) return callback(null, list);
      const first = list[0]!;
      return callback(null, first.address, first.family);
    });
  };
}

/** Vérifications réseau d'une URL avant chaque requête (y compris après redirection). */
export function assertFetchableUrl(
  raw: string,
  allowedPorts: readonly number[],
  isAllowedIp: (ip: string) => boolean = isPublicIp,
): URL {
  const v = validateUserUrl(raw);
  if (!v.ok) throw err(v.error);
  const url = v.url;
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  if (!allowedPorts.includes(port))
    throw err({ code: 'BLOCKED_PORT', message: `Le port ${port} n'est pas autorisé. Ports acceptés : ${allowedPorts.join(', ')}.` });
  const host = bareHostname(url.hostname);
  if (net.isIP(host) && !isAllowedIp(host))
    throw err({ code: 'BLOCKED_HOST', message: 'Cette adresse IP est privée, locale ou réservée : elle ne peut pas être analysée.' });
  return url;
}

function mapNetworkError(e: unknown): SeoQuickError {
  if (e instanceof SeoQuickError) return e;
  const code = (e as NodeJS.ErrnoException)?.code;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ENODATA')
    return err({ code: 'DNS_FAILURE', message: "Le nom de domaine n'a pas pu être résolu. Vérifiez l'orthographe de l'adresse." });
  if (code === 'ECONNREFUSED')
    return err({ code: 'NETWORK_ERROR', message: 'Le serveur du site a refusé la connexion.', details: code });
  if (code === 'ECONNRESET' || code === 'EPIPE')
    return err({ code: 'NETWORK_ERROR', message: 'La connexion a été interrompue par le serveur du site.', details: code });
  if (typeof code === 'string' && (code.startsWith('ERR_TLS') || code.includes('CERT') || code.startsWith('ERR_SSL')))
    return err({ code: 'NETWORK_ERROR', message: 'La connexion sécurisée (HTTPS) a échoué : certificat invalide ou configuration TLS incorrecte.', details: code });
  if (code === 'HPE_HEADER_OVERFLOW')
    return err({ code: 'NETWORK_ERROR', message: 'Les en-têtes HTTP renvoyés par le site sont trop volumineux.', details: code });
  return err({ code: 'NETWORK_ERROR', message: 'La page n’a pas pu être récupérée (erreur réseau).', details: code ?? (e instanceof Error ? e.message : undefined) });
}

function decodedStream(res: http.IncomingMessage): Readable {
  const encoding = String(res.headers['content-encoding'] ?? '').trim().toLowerCase();
  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      return res.pipe(zlib.createGunzip());
    case 'deflate':
      return res.pipe(zlib.createInflate());
    case 'br':
      return res.pipe(zlib.createBrotliDecompress());
    case '':
    case 'identity':
      return res;
    default:
      throw err({ code: 'NOT_HTML', message: `Encodage de contenu non pris en charge : ${encoding}.` });
  }
}

/** Corps attendu seulement pour une réponse 2xx HTML. */
function shouldReadBody(status: number, contentType: string | null): boolean {
  if (status < 200 || status >= 300) return false;
  return contentType === null || /^(text\/html|application\/xhtml\+xml)\b/i.test(contentType);
}

function requestOnce(
  url: URL,
  cfg: FetchConfig,
  lookup: ReturnType<typeof createSafeLookup>,
  isAllowedIp: (ip: string) => boolean,
  signal: AbortSignal,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: bareHostname(url.hostname),
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        agent: false, // connexion neuve : le lookup sécurisé s'applique à chaque requête
        lookup: lookup as unknown as net.LookupFunction,
        signal,
        timeout: cfg.socketTimeoutMs,
        headers: {
          'User-Agent': cfg.userAgent,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          'Accept-Language': 'fr,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'close',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : null;
        if (!shouldReadBody(status, contentType)) {
          res.resume();
          res.destroy();
          return resolve({ status, headers: res.headers, body: null });
        }
        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > cfg.maxBytes) {
          res.destroy();
          return reject(tooLarge(cfg.maxBytes));
        }
        let stream: Readable;
        try {
          stream = decodedStream(res);
        } catch (e) {
          res.destroy();
          return reject(e);
        }
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > cfg.maxBytes) {
            stream.destroy();
            res.destroy();
            req.destroy();
            return reject(tooLarge(cfg.maxBytes));
          }
          chunks.push(chunk);
        });
        stream.on('end', () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
        stream.on('error', (e) =>
          reject(e instanceof SeoQuickError ? e : err({ code: 'NETWORK_ERROR', message: 'Réponse compressée corrompue ou interrompue.', details: e.message })),
        );
        res.on('error', reject);
      },
    );

    req.on('socket', (socket: Socket) => {
      // Défense en profondeur : l'adresse effectivement connectée doit être publique.
      socket.once('connect', () => {
        const remote = socket.remoteAddress;
        if (!remote || !isAllowedIp(remote)) {
          req.destroy(err({ code: 'BLOCKED_HOST', message: 'Connexion refusée : adresse de destination non publique.' }));
        }
      });
    });
    req.on('timeout', () => req.destroy(err({ code: 'TIMEOUT', message: 'Le site met trop de temps à répondre.' })));
    req.on('error', reject);
    req.end();
  });
}

function tooLarge(maxBytes: number) {
  return err({
    code: 'TOO_LARGE',
    message: `La page dépasse la taille maximale analysable (${Math.round(maxBytes / 1_000_000)} Mo). Aucune analyse partielle n'est affichée pour éviter des conclusions fausses.`,
  });
}

/** Détermine l'encodage de caractères : en-tête HTTP, puis <meta charset>, puis UTF-8. */
export function decodeHtml(body: Buffer, contentType: string | null): string {
  const fromHeader = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? '')?.[1];
  const head = body.subarray(0, 2048).toString('latin1');
  const fromMeta =
    /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1];
  for (const label of [fromHeader, fromMeta, 'utf-8']) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(body);
    } catch {
      // libellé inconnu : on essaie le suivant
    }
  }
  return body.toString('utf8');
}

export async function secureFetch(rawUrl: string, cfg: FetchConfig, deps: FetchDeps = {}): Promise<FetchedPage> {
  const isAllowedIp = deps.isAllowedIp ?? isPublicIp;
  const lookup = createSafeLookup(deps.resolver, isAllowedIp);
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const redirects: string[] = [];

  try {
    let current = assertFetchableUrl(rawUrl, cfg.allowedPorts, isAllowedIp);
    const requestedUrl = current.href;

    for (let hop = 0; ; hop++) {
      let res: RawResponse;
      try {
        res = await requestOnce(current, cfg, lookup, isAllowedIp, controller.signal);
      } catch (e) {
        if (controller.signal.aborted)
          throw err({ code: 'TIMEOUT', message: `Le site n'a pas répondu dans le délai imparti (${Math.round(cfg.timeoutMs / 1000)} s).` });
        throw mapNetworkError(e);
      }

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.location;
        if (!location) throw err({ code: 'HTTP_ERROR', httpStatus: res.status, message: `Redirection ${res.status} sans destination.` });
        if (hop >= cfg.maxRedirects)
          throw err({ code: 'TOO_MANY_REDIRECTS', message: `Trop de redirections (plus de ${cfg.maxRedirects}).` });
        let next: string;
        try {
          next = new URL(location, current).href;
        } catch {
          throw err({ code: 'INVALID_URL', message: 'La redirection pointe vers une adresse invalide.' });
        }
        redirects.push(next);
        current = assertFetchableUrl(next, cfg.allowedPorts, isAllowedIp); // revalidation complète du saut
        continue;
      }

      if (res.status < 200 || res.status >= 300)
        throw err({
          code: 'HTTP_ERROR',
          httpStatus: res.status,
          message: `La page a répondu avec le code HTTP ${res.status}. Aucun diagnostic n'est produit pour une page inaccessible.`,
        });

      const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : null;
      if (!res.body)
        throw err({ code: 'NOT_HTML', message: `Le contenu reçu n'est pas une page HTML (${contentType ?? 'type inconnu'}).` });

      const html = decodeHtml(res.body, contentType);
      if (contentType === null && !/<(!doctype html|html|head|body)\b/i.test(html.slice(0, 4096)))
        throw err({ code: 'NOT_HTML', message: "Le contenu reçu ne ressemble pas à une page HTML." });

      const xr = res.headers['x-robots-tag'];
      return {
        requestedUrl,
        finalUrl: current.href,
        status: res.status,
        redirects,
        contentType,
        xRobotsTag: Array.isArray(xr) ? xr.join(', ') : (xr ?? null),
        bytes: res.body.length,
        html,
      };
    }
  } finally {
    clearTimeout(deadline);
  }
}
