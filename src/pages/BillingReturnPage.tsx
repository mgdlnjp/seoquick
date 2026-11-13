import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { activateSubscription, BillingError } from '../lib/billing';
import { btn } from '../lib/cn';

type Status = { kind: 'loading' } | { kind: 'success' } | { kind: 'error'; message: string };

/**
 * Retour de Stripe Checkout (/abonnement/?session_id=…).
 * La page est pré-rendue en état « chargement » ; l'activation se fait après l'hydratation.
 */
export function BillingReturnPage() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    const activation: Promise<Status> = sessionId
      ? activateSubscription(sessionId).then(() => {
          // Retire l'identifiant de session de la barre d'adresse.
          window.history.replaceState({}, '', window.location.pathname);
          return { kind: 'success' };
        })
      : Promise.resolve({ kind: 'error', message: 'Le lien de confirmation est incomplet.' });
    activation
      .catch(
        (err: unknown): Status => ({
          kind: 'error',
          message: err instanceof BillingError ? err.message : 'L’activation a échoué. Réessayez dans un instant.',
        }),
      )
      .then(setStatus);
  }, []);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-20 text-center">
      <div aria-live="polite">
        {status.kind === 'loading' && (
          <>
            <Loader2 aria-hidden="true" className="mx-auto h-10 w-10 animate-spin text-signal-600" />
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.025em] text-ink-950">Activation de votre abonnement…</h1>
            <p className="mt-2 text-ink-600">Nous vérifions le paiement auprès de Stripe.</p>
          </>
        )}
        {status.kind === 'success' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-400">
              <CheckCircle2 aria-hidden="true" className="h-7 w-7 text-ink-950" />
            </span>
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.025em] text-ink-950">
              Bienvenue dans SEOQuick <span className="font-serif font-normal text-signal-700 italic">Pro</span>
            </h1>
            <p className="mt-3 text-ink-600">
              Vos analyses sont désormais illimitées sur ce navigateur. Vous pouvez gérer ou résilier l’abonnement à tout
              moment depuis la page d’accueil.
            </p>
            <a href="/#analyse" className={btn('dark', 'lg', 'mt-8')}>
              Analyser une page
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </>
        )}
        {status.kind === 'error' && (
          <>
            <AlertCircle aria-hidden="true" className="mx-auto h-12 w-12 text-status-critical" />
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.025em] text-ink-950">L’abonnement n’a pas pu être activé</h1>
            <p role="alert" className="mt-3 text-ink-700">
              {status.message}
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Si vous avez été débité, rechargez cette page dans quelques secondes. Si le problème persiste, contactez-nous
              avec votre reçu Stripe.
            </p>
            <a href="/" className={btn('outline', 'md', 'mt-8')}>
              Retour à l’accueil
            </a>
          </>
        )}
      </div>
    </section>
  );
}
