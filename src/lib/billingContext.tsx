import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AccessInfo, BillingConfig } from '../core/billing';
import { BillingError, fetchAccess, fetchBillingConfig, openBillingPortal, startCheckout } from './billing';

export interface BillingApi {
  config: BillingConfig | null;
  access: AccessInfo | null;
  /** Abonnement disponible (Stripe configuré et prix connu). */
  enabled: boolean;
  setAccess: (access: AccessInfo) => void;
  paywall: { open: boolean; quotaReached: boolean };
  openPaywall: (quotaReached?: boolean) => void;
  closePaywall: () => void;
  redirecting: boolean;
  error: string | null;
  upgrade: () => void;
  manage: () => void;
}

const BillingContext = createContext<BillingApi | null>(null);

/**
 * État de l'abonnement, chargé après l'hydratation (le HTML pré-rendu n'en dépend pas).
 */
export function BillingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [paywall, setPaywall] = useState({ open: false, quotaReached: false });
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchBillingConfig(), fetchAccess()])
      .then(([cfg, acc]) => {
        if (!alive) return;
        setConfig(cfg);
        setAccess(acc);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setError(null);
    setRedirecting(true);
    try {
      await fn(); // redirection vers Stripe : on reste en état « redirection »
    } catch (err) {
      setRedirecting(false);
      setError(err instanceof BillingError ? err.message : 'Le paiement est momentanément indisponible.');
    }
  }, []);

  const openPaywall = useCallback((quotaReached = false) => setPaywall({ open: true, quotaReached }), []);
  const closePaywall = useCallback(() => {
    setPaywall((p) => ({ ...p, open: false }));
    setError(null);
  }, []);
  const upgrade = useCallback(() => void run(startCheckout), [run]);
  const manage = useCallback(() => void run(openBillingPortal), [run]);

  const api = useMemo<BillingApi>(
    () => ({
      config,
      access,
      enabled: !!config?.enabled && !!config.price,
      setAccess,
      paywall,
      openPaywall,
      closePaywall,
      redirecting,
      error,
      upgrade,
      manage,
    }),
    [config, access, paywall, openPaywall, closePaywall, redirecting, error, upgrade, manage],
  );
  return <BillingContext.Provider value={api}>{children}</BillingContext.Provider>;
}

/** `null` hors d'un <BillingProvider> (pages sans abonnement). */
// eslint-disable-next-line react-refresh/only-export-components
export function useBilling(): BillingApi | null {
  return useContext(BillingContext);
}
