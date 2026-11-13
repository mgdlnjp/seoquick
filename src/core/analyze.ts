import { extractSeoData } from './extract';
import { buildRecommendations, isLikelyClientRendered } from './recommendations';
import { runAllChecks } from './rules';
import { computeScore } from './score';
import { SeoQuickError } from './types';
import type { AnalysisContext, AnalysisResult, AnalysisSource } from './types';

export const BASE_NOTICES = [
  'Analyse du HTML initial uniquement : le contenu ajouté par JavaScript après le chargement peut ne pas apparaître ici.',
  '« Non détecté » signifie « absent du HTML reçu pour cette URL », pas forcément inexistant sur le site.',
  'Le score est un indicateur pédagogique calculé par SEOQuick. Ce n’est ni une mesure ni un critère de Google, et il ne garantit aucun classement.',
];

/**
 * Pipeline complet : HTML → extraction → contrôles → score → recommandations.
 * Fonction pure (sans réseau) : utilisée par le serveur et par le mode démo.
 */
export function analyzeHtml(html: string, ctx: AnalysisContext, source: AnalysisSource): AnalysisResult {
  let extracted;
  try {
    extracted = extractSeoData(html);
  } catch (err) {
    throw new SeoQuickError({
      code: 'PARSE_ERROR',
      message: "Le HTML reçu n'a pas pu être analysé. Aucun résultat n'est affiché pour éviter un diagnostic erroné.",
      details: err instanceof Error ? err.message : undefined,
    });
  }

  const checks = runAllChecks(extracted, ctx);
  const score = computeScore(checks);
  const recommendations = buildRecommendations(checks, extracted);

  const notices = [...BASE_NOTICES];
  if (source.kind === 'demo')
    notices.unshift('Mode démo : HTML d’exemple fictif intégré à SEOQuick. Aucune page réelle n’a été récupérée.');
  if (isLikelyClientRendered(extracted))
    notices.unshift(
      `Le HTML reçu contient très peu de texte visible (${extracted.signals.visibleTextLength} caractères) et ${extracted.signals.scriptCount} script(s) : la page est probablement générée côté client. Des éléments affichés dans le navigateur peuvent manquer à cette analyse.`,
    );

  return { source, extracted, checks, score, recommendations, notices };
}
