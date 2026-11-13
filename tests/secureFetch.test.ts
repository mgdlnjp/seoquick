import http from 'node:http';
import type { AddressInfo } from 'node:net';
import zlib from 'node:zlib';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { loadConfig } from '../server/config';
import { secureFetch } from '../server/fetch/secureFetch';
import type { FetchConfig, FetchDeps, LookupFn } from '../server/fetch/secureFetch';
import { SeoQuickError } from '../src/core/types';

/**
 * Serveur HTTP local jouant le rôle d'un « site public ».
 * Comme 127.0.0.1 est (à juste titre) bloqué, les tests injectent :
 *  - un résolveur DNS : site.test-public.com → 127.0.0.1, interne.test-public.com → 10.0.0.5
 *  - une politique IP qui considère 127.0.0.1 (et lui seul) comme « publique ».
 * Le reste du pipeline (redirections, revalidation, tailles, délais) est réel.
 */
let server: http.Server;
let port = 0;
const HTML = '<!doctype html><html lang="fr"><head><title>Page de test publique</title></head><body><h1>Salut</h1></body></html>';

const resolver = ((host: string, _o: unknown, cb: (e: Error | null, a: { address: string; family: number }[]) => void) => {
  const map: Record<string, string> = { 'site.test-public.com': '127.0.0.1', 'interne.test-public.com': '10.0.0.5' };
  const ip = map[host];
  if (!ip) return cb(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }), []);
  cb(null, [{ address: ip, family: 4 }]);
}) as unknown as LookupFn;

const deps: FetchDeps = { resolver, isAllowedIp: (ip) => ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' };
const base = () => `http://site.test-public.com:${port}`;
const cfg = (): FetchConfig => ({
  timeoutMs: 1500,
  socketTimeoutMs: 1000,
  maxBytes: 50_000,
  maxRedirects: 3,
  userAgent: 'SEOQuickBot/test',
  allowedPorts: [80, 443, port],
});

async function fetchCode(path: string, overrides: Partial<FetchConfig> = {}) {
  try {
    await secureFetch(`${base()}${path}`, { ...cfg(), ...overrides }, deps);
    return 'OK';
  } catch (e) {
    return e instanceof SeoQuickError ? e.info.code : String(e);
  }
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    switch (url.pathname) {
      case '/ok':
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Robots-Tag', 'noindex');
        res.end(HTML);
        return;
      case '/echo-headers':
        res.setHeader('Content-Type', 'text/html');
        res.end(`<html><head><title>${req.headers['user-agent']}|${req.headers.cookie ?? 'no-cookie'}|${req.headers.authorization ?? 'no-auth'}</title></head></html>`);
        return;
      case '/gzip':
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Encoding', 'gzip');
        res.end(zlib.gzipSync(HTML));
        return;
      case '/latin1':
        res.setHeader('Content-Type', 'text/html; charset=iso-8859-1');
        res.end(Buffer.from('<html><head><title>Café</title></head></html>', 'latin1'));
        return;
      case '/redirect':
        res.writeHead(302, { Location: '/ok' }).end();
        return;
      case '/redirect-loop':
        res.writeHead(301, { Location: '/redirect-loop' }).end();
        return;
      case '/redirect-internal':
        res.writeHead(302, { Location: `http://interne.test-public.com:${port}/ok` }).end();
        return;
      case '/redirect-metadata':
        res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' }).end();
        return;
      case '/redirect-file':
        res.writeHead(302, { Location: 'file:///etc/passwd' }).end();
        return;
      case '/redirect-port':
        res.writeHead(302, { Location: 'http://site.test-public.com:6379/' }).end();
        return;
      case '/big':
        res.setHeader('Content-Type', 'text/html');
        res.end(`<html><body>${'x'.repeat(100_000)}</body></html>`);
        return;
      case '/gzip-bomb':
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Encoding', 'gzip');
        res.end(zlib.gzipSync(Buffer.alloc(5_000_000, 'a')));
        return;
      case '/slow':
        res.setHeader('Content-Type', 'text/html');
        res.write('<html>');
        return; // ne termine jamais
      case '/json':
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
        return;
      case '/500':
        res.writeHead(500, { 'Content-Type': 'text/html' }).end('<h1>Erreur</h1>');
        return;
      default:
        res.writeHead(404, { 'Content-Type': 'text/html' }).end('<h1>404</h1>');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

describe('secureFetch', () => {
  it('récupère une page HTML et l’en-tête X-Robots-Tag', async () => {
    const page = await secureFetch(`${base()}/ok`, cfg(), deps);
    expect(page.status).toBe(200);
    expect(page.html).toContain('Page de test publique');
    expect(page.xRobotsTag).toBe('noindex');
  });

  it('envoie un user-agent explicite, sans cookie ni authentification', async () => {
    const page = await secureFetch(`${base()}/echo-headers`, cfg(), deps);
    expect(page.html).toContain('SEOQuickBot/test|no-cookie|no-auth');
  });

  it('décompresse gzip et respecte le charset déclaré', async () => {
    expect((await secureFetch(`${base()}/gzip`, cfg(), deps)).html).toContain('Page de test publique');
    expect((await secureFetch(`${base()}/latin1`, cfg(), deps)).html).toContain('Café');
  });

  it('suit une redirection valide et la consigne', async () => {
    const page = await secureFetch(`${base()}/redirect`, cfg(), deps);
    expect(page.finalUrl).toBe(`${base()}/ok`);
    expect(page.redirects).toEqual([`${base()}/ok`]);
  });

  it('revalide chaque redirection (domaine interne, IP de métadonnées, schéma, port)', async () => {
    expect(await fetchCode('/redirect-internal')).toBe('BLOCKED_HOST');
    expect(await fetchCode('/redirect-metadata')).toBe('BLOCKED_HOST');
    expect(await fetchCode('/redirect-file')).toBe('UNSUPPORTED_PROTOCOL');
    expect(await fetchCode('/redirect-port')).toBe('BLOCKED_PORT');
  });

  it('limite le nombre de redirections', async () => {
    expect(await fetchCode('/redirect-loop')).toBe('TOO_MANY_REDIRECTS');
  });

  it('limite la taille, y compris après décompression (bombe gzip)', async () => {
    expect(await fetchCode('/big')).toBe('TOO_LARGE');
    expect(await fetchCode('/gzip-bomb')).toBe('TOO_LARGE');
  });

  it('applique un délai maximal', async () => {
    expect(await fetchCode('/slow')).toBe('TIMEOUT');
  });

  it('refuse les contenus non HTML et les pages en erreur (pas de score trompeur)', async () => {
    expect(await fetchCode('/json')).toBe('NOT_HTML');
    expect(await fetchCode('/500')).toBe('HTTP_ERROR');
    expect(await fetchCode('/inexistante')).toBe('HTTP_ERROR');
  });

  it('refuse un domaine qui ne se résout pas', async () => {
    await expect(secureFetch(`http://absent.test-public.com:${port}/`, cfg(), deps)).rejects.toMatchObject({
      info: { code: 'DNS_FAILURE' },
    });
  });

  it('sans dépendances injectées, 127.0.0.1 est bloqué même sur un port autorisé', async () => {
    await expect(secureFetch(`http://127.0.0.1:${port}/ok`, cfg())).rejects.toMatchObject({ info: { code: 'BLOCKED_HOST' } });
  });
});

describe('API /api/analyze', () => {
  const makeApp = (env: Record<string, string> = {}) => {
    const config = loadConfig({ RATE_LIMIT_MAX: '100', ...env });
    config.fetch = { ...cfg() };
    return createApp({ config, fetchDeps: deps });
  };

  it('renvoie les contrôles pour une URL valide', async () => {
    const res = await request(makeApp()).post('/api/analyze').send({ url: `${base()}/ok` });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.result.checks).toHaveLength(8);
    expect(res.body.result.source.kind).toBe('live');
    expect(res.body.result.checks.find((c: { id: string }) => c.id === 'robots').status).toBe('warn');
  });

  it('rejette une URL invalide ou bloquée avec une erreur structurée, sans crash', async () => {
    const app = makeApp();
    for (const url of ['javascript:alert(1)', 'http://localhost/', 'http://10.0.0.1/', '', 'http://[::1]:80/']) {
      const res = await request(app).post('/api/analyze').send({ url });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(typeof res.body.error.code).toBe('string');
      expect(res.body.result).toBeUndefined();
    }
  });

  it('renvoie une erreur explicite (pas de score) pour une page inaccessible', async () => {
    const res = await request(makeApp()).post('/api/analyze').send({ url: `${base()}/500` });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({ code: 'HTTP_ERROR', httpStatus: 500 });
    expect(res.body.result).toBeUndefined();
  });

  it('gère un JSON malformé proprement', async () => {
    const res = await request(makeApp()).post('/api/analyze').set('Content-Type', 'application/json').send('{oops');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('applique la limitation de fréquence', async () => {
    const app = makeApp({ RATE_LIMIT_MAX: '3' });
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await request(app).post('/api/analyze').send({ url: 'http://localhost/' })).status);
    expect(codes).toEqual([400, 400, 400, 429, 429]);
  });

  it('désactive proprement l’analyse réelle si ENABLE_LIVE_FETCH=false', async () => {
    const res = await request(makeApp({ ENABLE_LIVE_FETCH: 'false' })).post('/api/analyze').send({ url: 'https://exemple.fr' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LIVE_FETCH_DISABLED');
  });
});
