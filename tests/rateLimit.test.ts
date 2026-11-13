import { describe, expect, it } from 'vitest';
import { loadConfig } from '../server/config';
import { ConcurrencyGate, FixedWindowRateLimiter } from '../server/http/rateLimit';

describe('FixedWindowRateLimiter', () => {
  it('autorise max requêtes par fenêtre puis bloque, et se réinitialise', () => {
    let now = 0;
    const rl = new FixedWindowRateLimiter(2, 60_000, () => now);
    expect(rl.hit('a').allowed).toBe(true);
    expect(rl.hit('a').allowed).toBe(true);
    const third = rl.hit('a');
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBe(60);
    expect(rl.hit('b').allowed).toBe(true); // clés indépendantes
    now = 60_000;
    expect(rl.hit('a').allowed).toBe(true);
  });
});

describe('ConcurrencyGate', () => {
  it('limite les récupérations simultanées', () => {
    const gate = new ConcurrencyGate(1);
    const release = gate.tryAcquire();
    expect(release).not.toBeNull();
    expect(gate.tryAcquire()).toBeNull();
    release!();
    release!(); // libération idempotente
    expect(gate.tryAcquire()).not.toBeNull();
  });
});

describe('loadConfig', () => {
  it('applique des valeurs par défaut sûres', () => {
    const c = loadConfig({});
    expect(c.fetch.allowedPorts).toEqual([80, 443]);
    expect(c.fetch.maxRedirects).toBe(5);
    expect(c.enableLiveFetch).toBe(true);
    expect(c.trustProxy).toBe(false);
  });

  it('refuse une configuration invalide au démarrage', () => {
    expect(() => loadConfig({ FETCH_TIMEOUT_MS: 'abc' })).toThrow(/FETCH_TIMEOUT_MS/);
    expect(() => loadConfig({ ENABLE_LIVE_FETCH: 'peut-être' })).toThrow(/ENABLE_LIVE_FETCH/);
  });
});
