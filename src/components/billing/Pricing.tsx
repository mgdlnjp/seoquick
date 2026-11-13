import { ArrowRight, Check } from 'lucide-react';
import { formatAmount, formatPrice } from '../../core/billing';
import { useBilling } from '../../lib/billingContext';
import { btn } from '../../lib/cn';
import { Eyebrow } from '../ui';
import { PRO_FEATURES } from './features';

/** Section tarifs : rendue seulement côté client, quand l'abonnement Stripe est configuré. */
export function Pricing() {
  const billing = useBilling();
  const config = billing?.config;
  const price = config?.price;
  if (!billing?.enabled || !config || !price) return null;
  const free = [
    'Essai gratuit, sans inscription',
    'Mode démo illimité',
    'Sans compte, sans carte bancaire',
  ];

  return (
    <section id="tarifs" aria-labelledby="tarifs-title" className="no-print scroll-mt-16 border-t border-ink-200/70 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <Eyebrow>Tarifs</Eyebrow>
          <h2 id="tarifs-title" className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-balance text-ink-950 sm:text-[2.6rem] sm:leading-[1.1]">
            Gratuit pour vérifier,{' '}
            <span className="font-serif font-normal tracking-[-0.01em] text-signal-700 italic">illimité</span> pour auditer.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
            Pas de compte à créer : l’abonnement est activé sur votre navigateur juste après le paiement.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-ink-200/80">
            <h3 className="text-lg font-semibold text-ink-950">Gratuit</h3>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-ink-950">0 €</p>
            <ul className="mt-6 space-y-2.5">
              {free.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[15px] text-ink-700">
                  <Check aria-hidden="true" className="h-4 w-4 text-ink-400" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#analyse" className={btn('outline', 'lg', 'mt-8 w-full')}>
              Analyser une page
            </a>
          </article>

          <article className="hero-bg relative overflow-hidden rounded-3xl p-7 text-white shadow-float">
            <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
            <div className="relative">
              <span className="absolute top-0 right-0 rounded-full bg-signal-400 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide text-ink-950 uppercase">
                Pro
              </span>
              <h3 className="text-lg font-semibold">Illimité</h3>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-[-0.03em] tabular-nums">{formatAmount(price)}</span>
                <span className="text-ink-400">/ {formatPrice(price).split(' / ')[1]}</span>
              </p>
              <ul className="mt-6 space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[15px] text-ink-200">
                    <Check aria-hidden="true" className="h-4 w-4 text-signal-400" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => billing.openPaywall(false)} className={btn('primary', 'lg', 'group/cta mt-8 w-full font-semibold')}>
                Passer à Pro
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
              </button>
              <p className="mt-3 text-center text-[12px] text-ink-400">Paiement sécurisé par Stripe</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
