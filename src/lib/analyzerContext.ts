import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { AnalysisError, AnalysisResult } from '../core/types';

export type AnalyzerState =
  | { kind: 'idle' }
  | { kind: 'loading'; url: string }
  | { kind: 'success'; result: AnalysisResult }
  | { kind: 'error'; error: AnalysisError; url: string | null };

export interface AnalyzerApi {
  state: AnalyzerState;
  /** Lance l'analyse d'une URL déjà validée et normalisée. */
  analyze: (url: string) => Promise<void>;
  /** Analyse locale d'une page d'exemple (aucun appel réseau). */
  runDemo: () => Promise<void>;
  /** Annule l'analyse en cours et revient à l'état initial. */
  cancel: () => void;
  /** Relance la dernière URL analysée. */
  retry: () => void;
  /** Champ URL du formulaire (pour « Nouvelle analyse », raccourci clavier…). */
  inputRef: RefObject<HTMLInputElement | null>;
  focusInput: () => void;
}

export const AnalyzerContext = createContext<AnalyzerApi | null>(null);

export function useAnalyzer(): AnalyzerApi {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error('useAnalyzer doit être utilisé dans <AnalyzerProvider>');
  return ctx;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
