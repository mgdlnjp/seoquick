import { analyzeHtml } from '../core/analyze';
import type { AnalysisResult } from '../core/types';
import { DEMO_LABEL, DEMO_PAGE_URL, SAMPLE_HTML } from './sampleHtml';

/**
 * Mode démo : analyse un HTML d'exemple embarqué avec le même moteur que le serveur.
 * Aucun appel réseau ; fonctionne même si l'API est indisponible.
 * `xRobotsTag: undefined` → l'en-tête HTTP est signalé comme non vérifiable.
 */
export function runDemo(): AnalysisResult {
  return analyzeHtml(
    SAMPLE_HTML,
    { pageUrl: DEMO_PAGE_URL, xRobotsTag: undefined },
    { kind: 'demo', label: DEMO_LABEL, pageUrl: DEMO_PAGE_URL },
  );
}
