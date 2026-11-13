import type { Check, Score } from './types';

/**
 * Règle du score (documentée et affichée sur le site) :
 *
 *   score = round( Σ points obtenus ÷ Σ points maximum des contrôles vérifiables × 100 )
 *
 * - Les contrôles « non vérifiables » sont exclus du numérateur ET du dénominateur
 *   (ex. : aucune image → le contrôle des alt ne pénalise ni n'avantage la page).
 * - Le calcul est déterministe : un même HTML donne toujours le même score.
 * - C'est un indicateur pédagogique propre à SEOQuick, pas une mesure de Google.
 */
export const SCORE_RULE =
  'Score = arrondi(points obtenus ÷ points maximum des contrôles vérifiables × 100). Les contrôles « non vérifiables » sont exclus du calcul.';

export function computeScore(checks: readonly Check[]): Score {
  const breakdown = checks.map((c) => ({
    id: c.id,
    label: c.label,
    points: c.points,
    maxPoints: c.maxPoints,
    counted: c.status !== 'unverifiable',
  }));
  const counted = breakdown.filter((b) => b.counted);
  const earned = counted.reduce((sum, b) => sum + b.points, 0);
  const possible = counted.reduce((sum, b) => sum + b.maxPoints, 0);
  const value = possible > 0 ? Math.round((earned / possible) * 100) : null;
  return { value, earned, possible, breakdown };
}

export type ScoreBand = 'bon' | 'moyen' | 'faible';

export function scoreBand(value: number): ScoreBand {
  if (value >= 80) return 'bon';
  if (value >= 50) return 'moyen';
  return 'faible';
}

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  bon: 'Bonne base',
  moyen: 'Des points à travailler',
  faible: 'Fondamentaux à revoir',
};
