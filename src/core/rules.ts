import type { AnalysisContext, Check, CheckId, CheckStatus, ExtractedData } from './types';

/**
 * Règles d'audit. Chaque règle transforme les données brutes en un contrôle
 * avec statut, explication et points. Les barèmes sont déclarés dans
 * `CHECK_DEFINITIONS` et affichés tels quels sur le site (règle visible).
 *
 * Seuils de longueur : repères éditoriaux courants (affichage dans les résultats),
 * PAS des pénalités Google.
 */

export const TITLE_RANGE = { min: 30, max: 60 } as const;
export const DESCRIPTION_RANGE = { min: 70, max: 160 } as const;

export interface CheckDefinition {
  id: CheckId;
  label: string;
  maxPoints: number;
  why: string;
  /** Barème lisible, affiché dans la section « Comment le score est calculé ». */
  scoring: string;
}

export const CHECK_DEFINITIONS: readonly CheckDefinition[] = [
  {
    id: 'title',
    label: 'Balise title',
    maxPoints: 20,
    why: "Le title sert souvent de titre cliquable dans les résultats de recherche et dans l'onglet du navigateur. Il aide les moteurs et les internautes à comprendre le sujet de la page.",
    scoring: `20 pts si un seul title de ${TITLE_RANGE.min} à ${TITLE_RANGE.max} caractères · 15 pts si longueur hors repère · 10 pts si plusieurs title · 0 si absent ou vide`,
  },
  {
    id: 'metaDescription',
    label: 'Meta description',
    maxPoints: 15,
    why: "La meta description peut être reprise comme extrait sous le titre dans les résultats. Elle n'est pas un critère de classement direct mais influence l'envie de cliquer.",
    scoring: `15 pts si une seule description de ${DESCRIPTION_RANGE.min} à ${DESCRIPTION_RANGE.max} caractères · 11 pts si longueur hors repère · 8 pts si plusieurs · 0 si absente ou vide`,
  },
  {
    id: 'h1',
    label: 'Titre H1',
    maxPoints: 15,
    why: 'Le H1 annonce le sujet principal de la page aux visiteurs, aux technologies d’assistance et aux moteurs.',
    scoring: '15 pts pour un H1 unique non vide · 10 pts si plusieurs H1 · 4 pts si H1 vide(s) · 0 si absent',
  },
  {
    id: 'h2',
    label: 'Sous-titres H2',
    maxPoints: 10,
    why: 'Les H2 structurent le contenu en sections : la page est plus facile à parcourir et son plan plus clair pour les moteurs.',
    scoring: '10 pts si au moins un H2 · 0 si aucun',
  },
  {
    id: 'images',
    label: 'Texte alternatif des images',
    maxPoints: 15,
    why: "L'attribut alt décrit l'image aux personnes malvoyantes et aux moteurs (recherche d'images). Un alt vide est correct pour une image purement décorative.",
    scoring: '15 × (1 − (images sans alt + ½ × images à alt vide) ÷ total), arrondi · non compté s’il n’y a aucune image',
  },
  {
    id: 'canonical',
    label: 'URL canonique',
    maxPoints: 10,
    why: "La balise canonical indique l'URL de référence quand un même contenu est accessible à plusieurs adresses (paramètres, versions http/https…).",
    scoring: '10 pts si une canonical valide pointe vers la page analysée · 5 pts si elle pointe ailleurs ou s’il y en a plusieurs · 3 pts si invalide · 0 si absente',
  },
  {
    id: 'robots',
    label: 'Directives robots',
    maxPoints: 10,
    why: 'Une directive noindex demande aux moteurs de ne pas afficher la page dans leurs résultats. Utile pour des pages privées, bloquant si elle est oubliée.',
    scoring: '10 pts sans directive restrictive · 5 pts si nofollow · 0 si noindex ou none',
  },
  {
    id: 'lang',
    label: 'Langue de la page',
    maxPoints: 5,
    why: "L'attribut lang de <html> indique la langue du contenu : il aide les lecteurs d'écran, la traduction automatique et le ciblage linguistique.",
    scoring: '5 pts si lang est présent et bien formé · 2 pts si mal formé · 0 si absent',
  },
] as const;

export function getDefinition(id: CheckId): CheckDefinition {
  const def = CHECK_DEFINITIONS.find((d) => d.id === id);
  if (!def) throw new Error(`Définition inconnue : ${id}`);
  return def;
}

/** Longueur en caractères perçus (gère les emoji et accents composés). */
export function charLength(text: string): number {
  return [...text].length;
}

function build(
  id: CheckId,
  status: CheckStatus,
  points: number,
  summary: string,
  advice: string,
  raw: string[],
): Check {
  const def = getDefinition(id);
  return { id, label: def.label, status, points, maxPoints: def.maxPoints, summary, advice, raw, why: def.why };
}

const quote = (s: string) => `« ${s} »`;

export function checkTitle(data: ExtractedData): Check {
  const nonEmpty = data.titles.filter(Boolean);
  const raw = data.titles.map((t, i) => `title ${i + 1} : ${t ? quote(t) : '(vide)'} — ${charLength(t)} caractères`);
  if (data.titles.length === 0)
    return build('title', 'missing', 0, 'Aucune balise <title> dans le HTML reçu.', 'Ajoutez un title unique et descriptif dans le <head>, qui résume le sujet de la page.', raw);
  const first = nonEmpty[0];
  if (first === undefined)
    return build('title', 'missing', 0, 'Balise <title> présente mais vide.', 'Renseignez le contenu de la balise title.', raw);
  if (data.titles.length > 1)
    return build('title', 'warn', 10, `${data.titles.length} balises <title> trouvées.`, 'Conservez une seule balise title par page : les navigateurs et moteurs ne retiennent que la première.', raw);
  const len = charLength(first);
  if (len < TITLE_RANGE.min || len > TITLE_RANGE.max) {
    const advice =
      len > TITLE_RANGE.max
        ? `Conseil éditorial : au-delà d’environ ${TITLE_RANGE.max} caractères, le titre risque d’être tronqué à l’affichage (la limite réelle dépend de la largeur en pixels). Ce n’est pas une pénalité : placez simplement l’essentiel au début.`
        : `Conseil éditorial : un titre de moins de ${TITLE_RANGE.min} caractères peut manquer de précision. Ajoutez le sujet ou le bénéfice principal si c’est pertinent.`;
    return build('title', 'warn', 15, `${len} caractères (repère : ${TITLE_RANGE.min}–${TITLE_RANGE.max}).`, advice, raw);
  }
  return build('title', 'pass', 20, `${len} caractères.`, 'Le title est présent et de longueur confortable. Vérifiez qu’il est unique sur le site.', raw);
}

export function checkMetaDescription(data: ExtractedData): Check {
  const list = data.metaDescriptions;
  const raw = list.map((d, i) => `description ${i + 1} : ${d ? quote(d) : '(vide)'} — ${charLength(d)} caractères`);
  if (list.length === 0)
    return build('metaDescription', 'missing', 0, 'Aucune meta description dans le HTML reçu.', 'Ajoutez une meta description qui résume la page et donne envie de cliquer. Sans elle, le moteur choisit lui-même un extrait.', raw);
  const first = list.find(Boolean);
  if (first === undefined)
    return build('metaDescription', 'missing', 0, 'Meta description présente mais vide.', 'Renseignez l’attribut content de la meta description.', raw);
  if (list.length > 1)
    return build('metaDescription', 'warn', 8, `${list.length} meta descriptions trouvées.`, 'Gardez une seule meta description par page pour éviter toute ambiguïté.', raw);
  const len = charLength(first);
  if (len < DESCRIPTION_RANGE.min || len > DESCRIPTION_RANGE.max)
    return build(
      'metaDescription',
      'warn',
      11,
      `${len} caractères (repère : ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max}).`,
      len > DESCRIPTION_RANGE.max
        ? 'Conseil éditorial : une description longue risque d’être coupée à l’affichage. Mettez l’information clé dans la première phrase.'
        : 'Conseil éditorial : une description très courte exploite peu l’espace disponible. Précisez le contenu ou le bénéfice de la page.',
      raw,
    );
  return build('metaDescription', 'pass', 15, `${len} caractères.`, 'La meta description est présente et de longueur confortable.', raw);
}

export function checkH1(data: ExtractedData): Check {
  const raw = data.h1.map((t, i) => `H1 ${i + 1} : ${t ? quote(t) : '(vide ou image sans texte)'}`);
  const count = data.h1.length;
  const nonEmpty = data.h1.filter(Boolean).length;
  if (count === 0)
    return build('h1', 'missing', 0, 'Aucun H1 dans le HTML reçu.', 'Ajoutez un titre H1 visible qui annonce clairement le sujet de la page.', raw);
  if (nonEmpty === 0)
    return build('h1', 'warn', 4, `${count} H1 trouvé(s), sans texte.`, 'Le H1 ne contient pas de texte (image sans alt, icône ou contenu injecté en JavaScript ?). Ajoutez un intitulé textuel.', raw);
  if (count > 1)
    return build('h1', 'warn', 10, `${count} H1 trouvés.`, 'Plusieurs H1 sont autorisés en HTML, mais un H1 unique rend le sujet principal plus évident. Passez les autres en H2 si ce sont des sous-parties.', raw);
  return build('h1', 'pass', 15, '1 H1 trouvé.', 'Le H1 est unique et contient du texte.', raw);
}

export function checkH2(data: ExtractedData): Check {
  const count = data.h2.length;
  const raw = data.h2.slice(0, 10).map((t, i) => `H2 ${i + 1} : ${t ? quote(t) : '(vide)'}`);
  if (count > 10) raw.push(`… et ${count - 10} autre(s)`);
  if (count === 0)
    return build('h2', 'missing', 0, 'Aucun H2 dans le HTML reçu.', 'Si la page contient plusieurs sections, introduisez-les par des sous-titres H2. Pour une page très courte, ce n’est pas indispensable.', raw);
  return build('h2', 'pass', 10, `${count} H2 trouvé(s).`, 'La page est structurée en sections. Vérifiez que l’ordre des titres reste logique.', raw);
}

export function checkImages(data: ExtractedData): Check {
  const { total, missingAlt, emptyAlt, missingAltExamples } = data.images;
  const raw = [
    `${total} image(s) <img>`,
    `${missingAlt} sans attribut alt`,
    `${emptyAlt} avec alt vide`,
    ...missingAltExamples.map((src) => `sans alt : ${src}`),
  ];
  if (total === 0)
    return build('images', 'unverifiable', 0, 'Aucune balise <img> dans le HTML reçu.', 'Rien à vérifier ici. Les images ajoutées en CSS ou en JavaScript ne sont pas visibles par cette analyse.', raw);
  const penalty = missingAlt + 0.5 * emptyAlt;
  const points = Math.round(15 * (1 - penalty / total));
  if (missingAlt === 0 && emptyAlt === 0)
    return build('images', 'pass', 15, `${total} image(s), toutes avec un alt renseigné.`, 'Vérifiez que chaque alt décrit l’image de façon utile, sans bourrage de mots-clés.', raw);
  const parts = [];
  if (missingAlt) parts.push(`${missingAlt} sans attribut alt`);
  if (emptyAlt) parts.push(`${emptyAlt} avec alt vide`);
  return build(
    'images',
    'warn',
    points,
    `${total} image(s) : ${parts.join(', ')}.`,
    missingAlt
      ? 'Ajoutez un attribut alt à chaque image : un texte descriptif pour les images informatives, alt="" pour les images purement décoratives.'
      : 'Un alt vide est correct pour une image décorative. Si une de ces images porte une information, décrivez-la.',
    raw,
  );
}

function stripHash(u: URL): string {
  const copy = new URL(u.href);
  copy.hash = '';
  return copy.href;
}

export function checkCanonical(data: ExtractedData, ctx: AnalysisContext): Check {
  const list = data.canonicals;
  const raw = list.map((c, i) => `canonical ${i + 1} : ${c || '(href vide)'}`);
  if (list.length === 0)
    return build('canonical', 'missing', 0, 'Aucune balise canonical dans le HTML reçu.', 'Ajoutez <link rel="canonical" href="URL-de-référence"> pour indiquer l’adresse principale de la page (elle peut pointer vers elle-même).', raw);
  const distinct = [...new Set(list)];
  if (distinct.length > 1)
    return build('canonical', 'warn', 5, `${list.length} canonicals différentes.`, 'Plusieurs canonicals contradictoires peuvent être ignorées par les moteurs. Gardez-en une seule.', raw);

  let base: URL;
  try {
    base = new URL(data.baseHref ?? ctx.pageUrl, ctx.pageUrl);
  } catch {
    base = new URL(ctx.pageUrl);
  }
  let resolved: URL;
  try {
    if (!distinct[0]) throw new Error('vide');
    resolved = new URL(distinct[0], base);
  } catch {
    return build('canonical', 'warn', 3, 'Canonical présente mais invalide.', 'Corrigez la valeur href : elle doit contenir une URL valide, de préférence absolue.', raw);
  }
  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:')
    return build('canonical', 'warn', 3, 'Canonical avec un protocole inattendu.', 'La canonical doit être une URL http(s).', raw);

  raw.push(`URL résolue : ${resolved.href}`);
  if (!/^https?:\/\//i.test(distinct[0] ?? '')) raw.push('Valeur relative : une URL absolue est recommandée.');

  if (stripHash(resolved) !== stripHash(new URL(ctx.pageUrl)))
    return build(
      'canonical',
      'warn',
      5,
      'La canonical pointe vers une autre URL que la page analysée.',
      `Cette page désigne ${resolved.href} comme version de référence. C’est normal pour une page dupliquée ou paramétrée ; sinon, faites pointer la canonical vers l’URL de la page elle-même.`,
      raw,
    );
  return build('canonical', 'pass', 10, 'Canonical présente et cohérente avec l’URL analysée.', 'Rien à corriger. Vérifiez que les liens internes pointent vers cette même URL.', raw);
}

/** Directives normalisées, ex. "googlebot: noindex" → "noindex". */
export function parseRobotsDirectives(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .map((part) => {
      // Format X-Robots-Tag "user-agent: directive" (mais pas "max-snippet:…").
      const m = /^([a-z0-9_-]+)\s*:\s*(.+)$/.exec(part);
      if (m && m[1] && m[2] && !/^(max-snippet|max-image-preview|max-video-preview|unavailable_after)$/.test(m[1])) return m[2].trim();
      return part;
    })
    .filter(Boolean);
}

export function checkRobots(data: ExtractedData, ctx: AnalysisContext): Check {
  const raw = data.robotsMeta.map((m) => `<meta name="${m.name}" content="${m.content}">`);
  const directives = data.robotsMeta.flatMap((m) => parseRobotsDirectives(m.content));
  if (ctx.xRobotsTag === undefined) raw.push('En-tête HTTP X-Robots-Tag : non vérifiable (pas de réponse HTTP réelle).');
  else if (ctx.xRobotsTag) {
    raw.push(`En-tête HTTP X-Robots-Tag : ${ctx.xRobotsTag}`);
    directives.push(...parseRobotsDirectives(ctx.xRobotsTag));
  } else raw.push('En-tête HTTP X-Robots-Tag : absent');
  raw.push('robots.txt : non analysé par ce MVP.');

  if (directives.includes('noindex') || directives.includes('none'))
    return build('robots', 'warn', 0, 'Directive noindex détectée : la page demande à ne pas être indexée.', 'Si la page doit apparaître dans les résultats de recherche, retirez noindex. Si c’est volontaire (page privée, remerciement…), ignorez ce point.', raw);
  if (directives.includes('nofollow'))
    return build('robots', 'warn', 5, 'Directive nofollow détectée.', 'Les liens de cette page ne seront pas suivis par les moteurs. Retirez nofollow sauf raison précise.', raw);
  const summary =
    data.robotsMeta.length === 0
      ? 'Aucune meta robots dans le HTML reçu : la page est indexable par défaut.'
      : 'Meta robots présente, sans directive restrictive.';
  return build('robots', 'pass', 10, summary, 'Aucune directive n’empêche l’indexation dans le HTML reçu.', raw);
}

const LANG_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

export function checkLang(data: ExtractedData): Check {
  const lang = data.htmlLang?.trim() ?? null;
  const raw = [data.htmlLang === null ? 'Attribut lang absent de <html>' : `<html lang="${data.htmlLang}">`];
  if (!lang)
    return build('lang', 'missing', 0, 'Attribut lang non détecté sur <html>.', 'Ajoutez la langue du contenu, par exemple <html lang="fr">.', raw);
  if (!LANG_PATTERN.test(lang))
    return build('lang', 'warn', 2, `Valeur « ${lang} » mal formée.`, 'Utilisez un code de langue BCP 47, par exemple "fr", "fr-FR" ou "en".', raw);
  return build('lang', 'pass', 5, `Langue déclarée : ${lang}.`, 'Vérifiez que la valeur correspond bien à la langue du contenu.', raw);
}

export function runAllChecks(data: ExtractedData, ctx: AnalysisContext): Check[] {
  return [
    checkTitle(data),
    checkMetaDescription(data),
    checkH1(data),
    checkH2(data),
    checkImages(data),
    checkCanonical(data, ctx),
    checkRobots(data, ctx),
    checkLang(data),
  ];
}
