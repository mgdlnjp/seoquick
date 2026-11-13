import { Loader2, Settings2, Sparkles } from 'lucide-react';
import { useBilling } from '../../lib/billingContext';

/** Statut du forfait sous le formulaire du héros (fond sombre) : quota gratuit restant ou Pro. */
export function PlanStatus() {
  const billing = useBilling();
  if (!billing?.enabled || !billing.access || billing.access.plan === 'open') return null;
  const { access, redirecting, openPaywall, manage } = billing;

  if (access.plan === 'pro') {
    return (
      <div className="mt-4 flex items-center gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-signal-400 px-2.5 py-0.5 font-semibold text-ink-950">
          <Sparkles aria-hidden="true" className="h-3 w-3" />
          Pro
        </span>
        <span className="text-ink-300">Analyses illimitées</span>
        <button
          type="button"
          onClick={manage}
          disabled={redirecting}
          className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ink-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
        >
          {redirecting ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          Gérer l’abonnement
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-300">
      <button
        type="button"
        onClick={() => openPaywall(false)}
        className="inline-flex items-center gap-1 font-medium text-signal-400 underline-offset-4 transition hover:text-signal-300 hover:underline"
      >
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        Passer à Pro
      </button>
    </div>
  );
}
