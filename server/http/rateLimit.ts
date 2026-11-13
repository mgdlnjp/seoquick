/**
 * Limiteur de fréquence à fenêtre fixe, en mémoire, par clé (adresse IP).
 * Suffisant pour une instance unique ; en multi-instances, utiliser un stockage
 * partagé (Redis…) ou la limitation du reverse proxy.
 */
export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export class FixedWindowRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(max: number, windowMs: number, now: () => number = Date.now) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
  }

  hit(key: string): RateLimitDecision {
    const t = this.now();
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;
    if (this.hits.size > 10_000) this.prune(t);
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
    return { allowed: entry.count <= this.max, remaining: Math.max(0, this.max - entry.count), retryAfterSec };
  }

  prune(t = this.now()): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= t) this.hits.delete(key);
  }
}

/** Sémaphore minimal : limite le nombre de récupérations simultanées. */
export class ConcurrencyGate {
  private active = 0;
  private readonly limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  tryAcquire(): (() => void) | null {
    if (this.active >= this.limit) return null;
    this.active += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active -= 1;
      }
    };
  }
}
