import type { Check, CheckId, Effort, ExtractedData, Impact, Recommendation } from './types';

/**
 * Recommandations : une par contrôle non satisfaisant, triées par
 * impact estimé (décroissant) puis facilité (décroissante).
 * Les estimations d'impact sont des jugements éditoriaux, pas des mesures.
 * On renvoie entre 3 et 5 recommandations ; si la page a peu de défauts,
 * on complète avec des bonnes pratiques générales clairement marquées.
 */

export const MIN_RECOMMENDATIONS = 3;
export const MAX_RECOMMENDATIONS = 5;

const IMPACT_RANK: Record<Impact, number> = { élevé: 3, moyen: 2, faible: 1 };
const EFFORT_RANK: Record<Effort, number> = { facile: 3, moyen: 2, 'plus long': 1 };

type Template = Omit<Recommendation, 'id' | 'generic'>;

/** Modèle de recommandation selon le contrôle et son statut. */
function templateFor(check: Check): Template | null {
  const t = (title: string, detail: string, impact: Impact, effort: Effort): Template => ({ title, detail, impact, effort });
  const map: Record<CheckId, () => Template | null> = {
    robots: () =>
      check.points === 0
        ? t('Vérifier la directive noindex', 'La page demande à être exclue des moteurs. Si elle doit être trouvée, retirez noindex : c’est le blocage le plus important.', 'élevé', 'facile')
        : t('Revoir la directive nofollow', 'Les liens de la page ne sont pas suivis. Retirez nofollow si ce n’est pas voulu.', 'moyen', 'facile'),
    title: () =>
      check.status === 'missing'
        ? t('Ajouter une balise title', 'Rédigez un titre unique qui résume le sujet de la page, l’essentiel au début.', 'élevé', 'facile')
        : t('Ajuster le title', check.advice, 'moyen', 'facile'),
    h1: () =>
      check.status === 'missing'
        ? t('Ajouter un titre H1', 'Ajoutez un H1 visible qui annonce clairement le sujet de la page.', 'élevé', 'facile')
        : t('Clarifier le H1', check.advice, 'moyen', 'facile'),
    metaDescription: () =>
      check.status === 'missing'
        ? t('Rédiger une meta description', 'Un résumé de 1 à 2 phrases peut être repris comme extrait dans les résultats et donner envie de cliquer.', 'moyen', 'facile')
        : t('Ajuster la meta description', check.advice, 'faible', 'facile'),
    canonical: () =>
      check.status === 'missing'
        ? t('Déclarer une URL canonique', 'Ajoutez <link rel="canonical"> vers l’URL de référence pour limiter les doublons (paramètres, variantes d’URL).', 'moyen', 'facile')
        : t('Vérifier la canonical', check.advice, 'moyen', 'facile'),
    images: () => t('Compléter les textes alternatifs', check.advice, 'moyen', 'moyen'),
    h2: () => t('Structurer le contenu avec des H2', 'Découpez le contenu en sections introduites par des sous-titres H2 explicites.', 'faible', 'moyen'),
    lang: () => t('Déclarer la langue de la page', 'Ajoutez lang="fr" (ou la langue du contenu) sur la balise <html>.', 'faible', 'facile'),
  };
  if (check.status === 'pass' || check.status === 'unverifiable') return null;
  return map[check.id]();
}

const GENERIC: Recommendation[] = [
  {
    id: 'generic-search-console',
    title: 'Inspecter la page dans Google Search Console',
    detail: 'L’outil d’inspection d’URL montre la page telle que Google l’a explorée et rendue, y compris le contenu ajouté par JavaScript.',
    impact: 'moyen',
    effort: 'facile',
    generic: true,
  },
  {
    id: 'generic-other-pages',
    title: 'Contrôler vos autres pages importantes',
    detail: 'Cette analyse porte sur une seule URL. Vérifiez aussi vos pages de service, catégories ou articles les plus visités.',
    impact: 'moyen',
    effort: 'moyen',
    generic: true,
  },
  {
    id: 'generic-content-review',
    title: 'Relire title, description et H1 comme un internaute',
    detail: 'Les balises sont en place : vérifiez qu’elles décrivent précisément la page et répondent à ce que cherche votre visiteur.',
    impact: 'faible',
    effort: 'facile',
    generic: true,
  },
];

export function isLikelyClientRendered(data: ExtractedData): boolean {
  return data.signals.visibleTextLength < 250 && data.signals.scriptCount > 0;
}

export function buildRecommendations(checks: readonly Check[], data: ExtractedData): Recommendation[] {
  const order = new Map(checks.map((c, i) => [c.id, i]));
  const specific: (Recommendation & { rank: number })[] = [];

  for (const check of checks) {
    const tpl = templateFor(check);
    if (tpl) specific.push({ ...tpl, id: `fix-${check.id}`, generic: false, rank: order.get(check.id) ?? 99 });
  }
  if (isLikelyClientRendered(data)) {
    specific.push({
      id: 'fix-client-rendering',
      title: 'Placer le contenu clé dans le HTML initial',
      detail: 'Le HTML reçu contient très peu de texte : la page semble générée par JavaScript. Le rendu serveur ou le pré-rendu rend le contenu visible sans exécution de scripts.',
      impact: 'élevé',
      effort: 'plus long',
      generic: false,
      rank: 100,
    });
  }

  specific.sort(
    (a, b) =>
      IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact] ||
      EFFORT_RANK[b.effort] - EFFORT_RANK[a.effort] ||
      a.rank - b.rank,
  );

  const result: Recommendation[] = specific.slice(0, MAX_RECOMMENDATIONS).map(({ rank: _rank, ...r }) => r);
  for (const g of GENERIC) {
    if (result.length >= MIN_RECOMMENDATIONS) break;
    result.push(g);
  }
  return result;
}
