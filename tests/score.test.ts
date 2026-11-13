import { describe, expect, it } from 'vitest';
import { analyzeHtml } from '../src/core/analyze';
import { extractSeoData } from '../src/core/extract';
import { buildRecommendations } from '../src/core/recommendations';
import {
  CHECK_DEFINITIONS,
  checkCanonical,
  checkImages,
  checkRobots,
  checkTitle,
  parseRobotsDirectives,
  runAllChecks,
} from '../src/core/rules';
import { computeScore } from '../src/core/score';
import { buildTextSummary } from '../src/core/summary';
import type { AnalysisSource } from '../src/core/types';
import { runDemo } from '../src/demo/runDemo';

const URL_ = 'https://ex.fr/page';
const ctx = { pageUrl: URL_, xRobotsTag: null };
const src: AnalysisSource = { kind: 'demo', label: 'test', pageUrl: URL_ };

const PERFECT = `<!doctype html><html lang="fr"><head>
<title>Pains au levain naturel cuits au feu de bois</title>
<meta name="description" content="Découvrez nos pains au levain naturel, pétris à la main et cuits chaque matin au feu de bois.">
<link rel="canonical" href="https://ex.fr/page">
</head><body><h1>Nos pains</h1><h2>Section</h2><img src="a.jpg" alt="Une miche"></body></html>`;

describe('barème', () => {
  it('totalise exactement 100 points', () => {
    expect(CHECK_DEFINITIONS.reduce((s, d) => s + d.maxPoints, 0)).toBe(100);
  });
});

describe('computeScore', () => {
  it('donne 100 pour une page qui satisfait tous les contrôles', () => {
    const r = analyzeHtml(PERFECT, ctx, src);
    expect(r.checks.every((c) => c.status === 'pass')).toBe(true);
    expect(r.score.value).toBe(100);
  });

  it('est reproductible (même HTML → même résultat)', () => {
    const a = analyzeHtml(PERFECT.replace('<h2>Section</h2>', ''), ctx, src);
    const b = analyzeHtml(PERFECT.replace('<h2>Section</h2>', ''), ctx, src);
    expect(a.score).toEqual(b.score);
    expect(a.score.value).toBe(90);
  });

  it('donne un score bas mais non nul pour une page vide (robots par défaut = indexable)', () => {
    const r = analyzeHtml('<html><body></body></html>', ctx, src);
    // images non vérifiables → dénominateur 85 ; seul robots (10) est acquis
    expect(r.score.possible).toBe(85);
    expect(r.score.earned).toBe(10);
    expect(r.score.value).toBe(Math.round((10 / 85) * 100));
  });

  it('exclut les contrôles non vérifiables du numérateur et du dénominateur', () => {
    const checks = runAllChecks(extractSeoData(PERFECT.replace('<img src="a.jpg" alt="Une miche">', '')), ctx);
    const s = computeScore(checks);
    expect(checks.find((c) => c.id === 'images')?.status).toBe('unverifiable');
    expect(s.possible).toBe(85);
    expect(s.value).toBe(100);
  });

  it('renvoie null si aucun contrôle n’est vérifiable', () => {
    expect(computeScore([]).value).toBeNull();
  });
});

describe('règles', () => {
  it('title : longueur hors repère = à améliorer (conseil éditorial), pas absent', () => {
    const c = checkTitle(extractSeoData('<title>Court</title>'));
    expect(c.status).toBe('warn');
    expect(c.points).toBe(15);
    expect(c.advice).toMatch(/éditorial/);
  });

  it('title absent = non détecté, 0 point', () => {
    const c = checkTitle(extractSeoData('<p>x</p>'));
    expect(c.status).toBe('missing');
    expect(c.summary).toMatch(/HTML reçu/);
  });

  it('images : pénalité pleine sans alt, demi-pénalité pour alt vide', () => {
    const c = checkImages(extractSeoData('<img src=a><img src=b alt=""><img src=c alt=x><img src=d alt=y>'));
    // 15 × (1 − (1 + 0.5) / 4) = 9.375 → 9
    expect(c.points).toBe(9);
    expect(c.status).toBe('warn');
  });

  it('canonical : relative résolue, ailleurs = à vérifier, invalide = 3 pts', () => {
    expect(checkCanonical(extractSeoData('<link rel=canonical href="/page">'), ctx).status).toBe('pass');
    const other = checkCanonical(extractSeoData('<link rel=canonical href="https://ex.fr/autre">'), ctx);
    expect(other.status).toBe('warn');
    expect(other.points).toBe(5);
    expect(checkCanonical(extractSeoData('<link rel=canonical href="http://[bad">'), ctx).points).toBe(3);
  });

  it('robots : noindex via meta ou en-tête X-Robots-Tag', () => {
    expect(checkRobots(extractSeoData('<meta name=robots content="NOINDEX">'), ctx).points).toBe(0);
    const header = checkRobots(extractSeoData('<p>x</p>'), { pageUrl: URL_, xRobotsTag: 'googlebot: noindex' });
    expect(header.status).toBe('warn');
    expect(checkRobots(extractSeoData('<p>x</p>'), ctx).status).toBe('pass');
  });

  it('robots : en-tête non vérifiable en démo', () => {
    const c = checkRobots(extractSeoData('<p>x</p>'), { pageUrl: URL_ });
    expect(c.raw.join(' ')).toMatch(/non vérifiable/);
  });

  it('parseRobotsDirectives conserve max-snippet et retire le préfixe user-agent', () => {
    expect(parseRobotsDirectives('googlebot: noindex, max-snippet:50')).toEqual(['noindex', 'max-snippet:50']);
  });
});

describe('recommandations', () => {
  it('renvoie entre 3 et 5 éléments triés par impact puis facilité', () => {
    const data = extractSeoData('<html><body><img src=x></body></html>');
    const recos = buildRecommendations(runAllChecks(data, ctx), data);
    expect(recos.length).toBeGreaterThanOrEqual(3);
    expect(recos.length).toBeLessThanOrEqual(5);
    const rank = { élevé: 3, moyen: 2, faible: 1 };
    for (let i = 1; i < recos.length; i++) expect(rank[recos[i - 1]!.impact]).toBeGreaterThanOrEqual(rank[recos[i]!.impact]);
    expect(recos[0]!.impact).toBe('élevé');
  });

  it('complète avec des bonnes pratiques générales marquées comme telles', () => {
    const r = analyzeHtml(PERFECT, ctx, src);
    expect(r.recommendations).toHaveLength(3);
    expect(r.recommendations.every((x) => x.generic)).toBe(true);
  });

  it('signale une page probablement rendue en JavaScript', () => {
    const r = analyzeHtml('<html><head><title>App</title></head><body><div id=root></div><script src=a.js></script></body></html>', ctx, src);
    expect(r.notices[0]).toMatch(/générée côté client/);
    expect(r.recommendations.some((x) => x.id === 'fix-client-rendering')).toBe(true);
  });
});

describe('mode démo et résumé', () => {
  it('la démo est clairement identifiée', () => {
    const r = runDemo();
    expect(r.source.kind).toBe('demo');
    expect(r.notices[0]).toMatch(/Mode démo/);
    expect(buildTextSummary(r)).toMatch(/MODE DÉMO/);
  });

  it('le résumé contient score, règle et contrôles', () => {
    const text = buildTextSummary(analyzeHtml(PERFECT, ctx, src));
    expect(text).toMatch(/Score indicatif : 100\/100/);
    expect(text).toMatch(/Contrôles vérifiables|points maximum/);
    expect(text).toMatch(/\[Correct\] Balise title/);
  });
});
