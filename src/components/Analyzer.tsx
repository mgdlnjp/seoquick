import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, ArrowRight, Globe, Loader2, Play } from 'lucide-react';
import { validateUserUrl } from '../core/urlValidation';
import { DEMO_ONLY, requestAnalysis } from '../lib/api';
import { AnalyzerContext, prefersReducedMotion, useAnalyzer } from '../lib/analyzerContext';
import { useBilling } from '../lib/billingContext';
import type { AnalyzerApi, AnalyzerState } from '../lib/analyzerContext';
import { btn, cn } from '../lib/cn';
import { Dashboard } from './Dashboard';
import { ErrorPanel } from './ErrorPanel';
import { LoadingState } from './LoadingState';
import { Kbd } from './ui';

/* ─── État partagé : formulaire (héros) ↔ résultats (section dédiée) ──── */
export function AnalyzerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalyzerState>({ kind: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const lastUrl = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const billing = useBilling();
  const setAccess = billing?.setAccess;
  const openPaywall = billing?.openPaywall;

  const analyze = useCallback(async (url: string) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    lastUrl.current = url;
    setState({ kind: 'loading', url });
    try {
      const res = await requestAnalysis(url, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setState(res.ok ? { kind: 'success', result: res.result } : { kind: 'error', error: res.error, url });
      // Abonnement : mise à jour du quota affiché, fenêtre Pro si le quota gratuit est atteint.
      const access = res.ok ? res.access : res.error.access;
      if (access) setAccess?.(access);
      if (!res.ok && res.error.code === 'QUOTA_EXCEEDED') openPaywall?.(true);
    } catch {
      // requête annulée (nouvelle soumission ou bouton « Annuler ») : rien à faire
    }
  }, [setAccess, openPaywall]);

  const runDemo = useCallback(async () => {
    controller.current?.abort();
    lastUrl.current = null;
    // Chargé à la demande : le parseur HTML n'alourdit pas la page d'accueil.
    const { runDemo: run } = await import('../demo/runDemo');
    setState({ kind: 'success', result: run() });
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState({ kind: 'idle' });
  }, []);

  const retry = useCallback(() => {
    if (lastUrl.current) void analyze(lastUrl.current);
  }, [analyze]);

  const focusInput = useCallback(() => {
    document.getElementById('analyse')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, []);

  const api = useMemo<AnalyzerApi>(
    () => ({ state, analyze, runDemo, cancel, retry, inputRef, focusInput }),
    [state, analyze, runDemo, cancel, retry, focusInput],
  );
  return <AnalyzerContext.Provider value={api}>{children}</AnalyzerContext.Provider>;
}

/* ─── Formulaire (dans le héros, sur fond sombre) ─────────────────────── */
export function AnalyzerForm() {
  const { state, analyze, runDemo, inputRef } = useAnalyzer();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const loading = state.kind === 'loading';

  // Raccourci « / » : place le curseur dans le champ, comme sur les outils pro.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputRef]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validateUserUrl(value);
    if (!v.ok) {
      setFieldError(v.error.message);
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    setValue(v.normalized);
    void analyze(v.normalized);
  }

  function onDemo() {
    setFieldError(null);
    void runDemo();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <label htmlFor={inputId} className="mb-2.5 block font-mono text-[11px] font-medium tracking-[0.14em] text-ink-300 uppercase">
        Adresse de la page à analyser
      </label>
      <div
        className={cn(
          'ring-gradient flex flex-col gap-2 rounded-2xl bg-white/[0.045] p-2 shadow-float backdrop-blur-md transition sm:flex-row sm:items-center',
          'focus-within:bg-white/[0.07]',
          fieldError && 'outline outline-1 outline-rose-400/70',
        )}
      >
        <div className="group flex min-w-0 flex-1 items-center gap-3 px-3">
          <Globe aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-ink-400 transition group-focus-within:text-signal-400" />
          <input
            ref={inputRef}
            id={inputId}
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="https://www.votre-site.fr/page"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${errorId} ${hintId}` : hintId}
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-ink-500 focus:outline-none"
          />
          {!value && (
            <span className="hidden shrink-0 items-center gap-1.5 text-xs text-ink-500 md:flex" aria-hidden="true">
              <Kbd tone="light">/</Kbd> pour saisir
            </span>
          )}
        </div>
        <button type="submit" disabled={loading || DEMO_ONLY} className={btn('primary', 'lg', 'group/btn rounded-xl font-semibold sm:px-7')}>
          {loading ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Analyse…
            </>
          ) : (
            <>
              Analyser ma page
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      {fieldError && (
        <p id={errorId} className="mt-3 flex items-center gap-2 text-sm font-medium text-rose-300">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /> {fieldError}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p id={hintId} className="text-[13px] text-ink-400">
          {DEMO_ONLY
            ? 'Version de démonstration statique : l’analyse d’URL réelles n’est pas disponible.'
            : 'Page publique en http(s). Une URL, analysée à partir de son HTML initial.'}
        </p>
        <button type="button" onClick={onDemo} className={btn('ghost-dark', 'sm', '-ml-3 self-start sm:ml-0 sm:self-auto')}>
          <Play aria-hidden="true" className="h-3.5 w-3.5 fill-signal-400 text-signal-400" />
          Essayer avec une page d’exemple
        </button>
      </div>
    </form>
  );
}

/* ─── Zone de résultats (sous le héros) ──────────────────────────────── */
export function AnalyzerResults() {
  const { state, runDemo, retry, cancel } = useAnalyzer();
  const billing = useBilling();
  const ref = useRef<HTMLDivElement>(null);
  const kind = state.kind;

  // Amène les résultats à l'écran dès qu'une analyse démarre (ou que la démo s'affiche).
  useEffect(() => {
    if (kind === 'idle' || !ref.current) return;
    const top = ref.current.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.6 || top < 0)
      ref.current.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [kind]);

  return (
    <div ref={ref} id="resultats" className="scroll-mt-16">
      <div aria-live="polite" className="sr-only">
        {state.kind === 'loading' && 'Analyse en cours…'}
        {state.kind === 'success' && 'Analyse terminée : le tableau de bord est affiché.'}
      </div>
      {state.kind !== 'idle' && (
        <section aria-label="Résultats de l’analyse" className="relative border-b border-ink-200/70 bg-paper">
          <div aria-hidden="true" className="grid-lines-light pointer-events-none absolute inset-x-0 top-0 h-80" />
          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            {state.kind === 'loading' && <LoadingState url={state.url} onCancel={cancel} />}
            {state.kind === 'error' && (
              <ErrorPanel
                error={state.error}
                onDemo={() => void runDemo()}
                onRetry={state.url ? retry : undefined}
                onUpgrade={billing?.enabled ? () => billing.openPaywall(true) : undefined}
              />
            )}
            {state.kind === 'success' && (
              <Dashboard key={state.result.source.kind === 'live' ? state.result.source.fetchedAt : 'demo'} result={state.result} />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
