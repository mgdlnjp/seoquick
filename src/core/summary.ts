import { SCORE_RULE } from './score';
import { STATUS_LABELS } from './types';
import type { AnalysisResult } from './types';

/** Résumé texte brut, destiné au presse-papiers (e-mail, ticket, document). */
export function buildTextSummary(result: AnalysisResult): string {
  const lines: string[] = [];
  const { source, score } = result;

  lines.push('SEOQuick — diagnostic SEO on-page');
  if (source.kind === 'live') {
    lines.push(`Page analysée : ${source.finalUrl}`);
    if (source.finalUrl !== source.requestedUrl) lines.push(`(URL demandée : ${source.requestedUrl})`);
    lines.push(`Date : ${new Date(source.fetchedAt).toLocaleString('fr-FR', { timeZone: 'UTC' })} UTC — HTTP ${source.httpStatus}`);
  } else {
    lines.push(`MODE DÉMO — ${source.label} (aucune page réelle récupérée)`);
  }
  lines.push('');
  lines.push(
    score.value === null
      ? 'Score indicatif : non calculable'
      : `Score indicatif : ${score.value}/100 (${score.earned}/${score.possible} points)`,
  );
  lines.push(SCORE_RULE);
  lines.push('');
  lines.push('Contrôles :');
  for (const c of result.checks) {
    lines.push(`- [${STATUS_LABELS[c.status]}] ${c.label} : ${c.summary} (${c.status === 'unverifiable' ? 'non compté' : `${c.points}/${c.maxPoints}`})`);
  }
  lines.push('');
  lines.push('Recommandations prioritaires :');
  result.recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title} — impact ${r.impact}, effort ${r.effort}${r.generic ? ' (bonne pratique générale)' : ''}`);
    lines.push(`   ${r.detail}`);
  });
  lines.push('');
  lines.push('À savoir :');
  for (const n of result.notices) lines.push(`- ${n}`);
  return lines.join('\n');
}
