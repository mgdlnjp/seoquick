import { useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, Check, Loader2, X, Zap } from 'lucide-react';
import { formatAmount, formatPrice } from '../../core/billing';
import { useBilling } from '../../lib/billingContext';
import { btn } from '../../lib/cn';
import { PRO_FEATURES } from './features';

/** Fenêtre d'abonnement, ouverte au dépassement du quota ou sur « Passer à Pro ». */
export function PaywallModal() {
  const billing = useBilling();
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = !!billing?.paywall.open;
  const close = billing?.closePaywall;

  useEffect(() => {
    if (!open || !close) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [open, close]);

  const price = billing?.config?.price;
  if (!billing || !open || !price || !billing.config) return null;
  const { paywall, redirecting, error, upgrade, closePaywall } = billing;

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={closePaywall} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="animate-fade-up relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-float ring-1 ring-ink-200 sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={closePaywall}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="hero-bg relative overflow-hidden px-6 pt-7 pb-6 text-white sm:px-8">
          <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
          <div className="relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-signal-400 text-ink-950">
              <Zap aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 id="paywall-title" className="mt-5 text-2xl leading-tight font-semibold tracking-[-0.025em]">
              {paywall.quotaReached ? 'Vos analyses gratuites sont épuisées' : 'Passez à SEOQuick Pro'}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-300">
              {paywall.quotaReached
                ? "Pour continuer dès maintenant, passez à l’accès illimité :"
                : 'Auditez toutes vos pages, sans compter.'}
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <p className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-[-0.03em] text-ink-950 tabular-nums">{formatAmount(price)}</span>
            <span className="text-ink-500">/ {formatPrice(price).split(' / ')[1]}</span>
          </p>
          <ul className="mt-5 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[15px] text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-200 text-signal-800">
                  <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[13px] text-rose-800 ring-1 ring-rose-200">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button type="button" data-autofocus onClick={upgrade} disabled={redirecting} className={btn('dark', 'lg', 'mt-6 w-full rounded-xl font-semibold')}>
            {redirecting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Redirection vers le paiement…
              </>
            ) : (
              <>
                S’abonner — {formatPrice(price)}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[12px] text-ink-400">
            Paiement sécurisé par Stripe. SEOQuick n’a jamais accès à vos coordonnées bancaires.
          </p>
        </div>
      </div>
    </div>
  );
}
