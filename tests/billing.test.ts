import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BILLING_URLS, billingErrorBody, createApp } from '../server/app';
import { createBillingContext, loadBillingSettings, type BillingSettings } from '../server/billing';
import { BillingUnavailableError, type BillingProvider } from '../server/billing/provider';
import { ACCESS_TOKEN_TTL_MS, signAccessToken } from '../server/billing/token';
import { loadConfig } from '../server/config';
import type { FetchDeps, LookupFn } from '../server/fetch/secureFetch';

/** Site « public » local (même principe que secureFetch.test.ts). */
let server: http.Server;
let port = 0;
let failNext = false;
const HTML = '<!doctype html><html lang="fr"><head><title>Page de test</title></head><body><h1>Salut</h1></body></html>';

const resolver = ((host: string, _o: unknown, cb: (e: Error | null, a: { address: string; family: number }[]) => void) => {
  if (host !== 'site.test-public.com') return cb(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }), []);
  cb(null, [{ address: '127.0.0.1', family: 4 }]);
}) as unknown as LookupFn;
const deps: FetchDeps = { resolver, isAllowedIp: (ip) => ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' };

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    if (failNext) {
      failNext = false;
      res.writeHead(200, { 'Content-Type': 'application/pdf' }).end('%PDF');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(HTML);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const SECRET = 'x'.repeat(40);
const SESSION = 'cs_test_a1B2c3D4e5F6g7H8';
const SETTINGS: BillingSettings = { stripeSecretKey: 'sk_test_x', stripePriceId: 'price_x', tokenSecret: SECRET, appUrl: 'https://seoquick.example' };

function fakeProvider(overrides: Partial<BillingProvider> = {}): BillingProvider {
  return {
    getPrice: async () => ({ amount: 900, currency: 'eur', interval: 'month', intervalCount: 1 }),
    createCheckout: vi.fn(async () => 'https://checkout.stripe.test/s'),
    resolveCheckout: async (id) => (id === SESSION ? { subscriptionId: 'sub_1', customerId: 'cus_1' } : null),
    isSubscriptionActive: async (id) => id === 'sub_1',
    createPortal: async ({ customerId }) => `https://billing.stripe.test/${customerId}`,
    ...overrides,
  };
}

function app(opts: { settings?: BillingSettings | null; provider?: BillingProvider | null } = {}) {
  const config = loadConfig({ RATE_LIMIT_MAX: '1000', ALLOWED_PORTS: String(port) });
  config.fetch = { ...config.fetch, timeoutMs: 2000, socketTimeoutMs: 1000, allowedPorts: [port] };
  const billing = createBillingContext({
    settings: opts.settings === undefined ? SETTINGS : opts.settings,
    freePerDay: 2,
    urls: BILLING_URLS,
    errorBody: billingErrorBody,
    provider: opts.provider === undefined ? fakeProvider() : opts.provider,
    log: () => {},
  });
  return createApp({ config, fetchDeps: deps, billing });
}

const proToken = (now = Date.now()) => signAccessToken({ sub: 'sub_1', cus: 'cus_1' }, SECRET, now);
const analyze = (a: ReturnType<typeof app>, token?: string) => {
  const req = request(a).post('/api/analyze');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send({ url: `http://site.test-public.com:${port}/` });
};

describe('configuration', () => {
  it('désactive la facturation sans Stripe et exige un secret robuste sinon', () => {
    expect(loadBillingSettings({})).toBeNull();
    expect(() => loadBillingSettings({ STRIPE_SECRET_KEY: 'sk', STRIPE_PRICE_ID: 'p' })).toThrow(/ACCESS_TOKEN_SECRET/);
  });
});

describe('analyses et quota', () => {
  it('laisse l’accès libre si la facturation est désactivée', async () => {
    const a = app({ settings: null, provider: null });
    for (let i = 0; i < 3; i++) {
      const res = await analyze(a);
      expect(res.body.ok).toBe(true);
      expect(res.body.access).toEqual({ plan: 'open' });
    }
  });

  it('bloque au-delà du quota gratuit avec une erreur structurée 402', async () => {
    const a = app();
    expect((await analyze(a)).body.access).toEqual({ plan: 'free', remaining: 1, limit: 2 });
    await analyze(a);
    const blocked = await analyze(a);
    expect(blocked.status).toBe(402);
    expect(blocked.body).toMatchObject({
      ok: false,
      error: { code: 'QUOTA_EXCEEDED', access: { plan: 'free', remaining: 0, limit: 2 } },
    });
  });

  it('ne décompte pas une analyse en échec', async () => {
    const a = app();
    failNext = true;
    const res = await analyze(a);
    expect(res.body.ok).toBe(false);
    expect((await request(a).get('/api/billing/status')).body).toEqual({ plan: 'free', remaining: 2, limit: 2 });
  });

  it('donne un accès illimité avec un jeton Pro et refuse un jeton expiré', async () => {
    const a = app();
    for (let i = 0; i < 3; i++) expect((await analyze(a, proToken())).body.access).toEqual({ plan: 'pro' });
    const expired = await analyze(a, proToken(Date.now() - ACCESS_TOKEN_TTL_MS - 1_000));
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('parcours d’abonnement', () => {
  it('expose le prix et crée la session avec les URL de l’application', async () => {
    const provider = fakeProvider();
    const a = app({ provider });
    expect((await request(a).get('/api/billing/config')).body).toMatchObject({ enabled: true, price: { amount: 900 } });
    await request(a).post('/api/billing/checkout').set('Host', 'evil.example');
    expect(provider.createCheckout).toHaveBeenCalledWith({
      successUrl: 'https://seoquick.example/abonnement/?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://seoquick.example/#analyse',
    });
  });

  it('active, renouvelle et ouvre le portail', async () => {
    const a = app();
    const { body } = await request(a).post('/api/billing/activate').send({ sessionId: SESSION });
    expect((await request(a).get('/api/billing/status').set('Authorization', `Bearer ${body.token}`)).body).toEqual({ plan: 'pro' });
    expect((await request(a).post('/api/billing/refresh').set('Authorization', `Bearer ${body.token}`)).status).toBe(200);
    expect((await request(a).post('/api/billing/portal').set('Authorization', `Bearer ${body.token}`)).body.url).toBe(
      'https://billing.stripe.test/cus_1',
    );
  });

  it('refuse une session non payée, un renouvellement sans jeton et gère l’indisponibilité de Stripe', async () => {
    const a = app();
    expect((await request(a).post('/api/billing/activate').send({ sessionId: 'cs_test_zzzzzzzzzzzzzzzz' })).status).toBe(402);
    expect((await request(a).post('/api/billing/refresh').send({ subscription_id: 'sub_1' })).status).toBe(401);
    const down = app({
      provider: fakeProvider({
        createCheckout: async () => {
          throw new BillingUnavailableError();
        },
      }),
    });
    const res = await request(down).post('/api/billing/checkout');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'BILLING_UNAVAILABLE' } });
  });
});
