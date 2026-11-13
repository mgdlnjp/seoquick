import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import type { ExtractedData } from './types';

/**
 * Extraction des éléments SEO à partir du HTML brut.
 * Utilise parse5 (algorithme de parsing HTML du WHATWG, identique aux navigateurs)
 * mais N'EXÉCUTE PAS JavaScript : seul le HTML initial est analysé.
 */

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
type ParentNode = DefaultTreeAdapterMap['parentNode'];

const HTML_NS = 'http://www.w3.org/1999/xhtml';
/** Contenu jamais affiché comme texte. */
const NON_VISIBLE = new Set(['script', 'style', 'template', 'noscript', 'head', 'svg', 'math']);

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function attr(el: Element, name: string): string | null {
  const found = el.attrs.find((a) => a.name === name);
  return found ? found.value : null;
}

/** Normalise les espaces (sauts de ligne, tabulations, espaces multiples). */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function textContent(node: Node): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value;
  if (!('childNodes' in node)) return '';
  // Le contenu d'un <template> est dans `content`, pas dans childNodes.
  return (node as ParentNode).childNodes.map(textContent).join('');
}

/** Texte « visible » approximatif : exclut scripts, styles, head… */
function visibleText(node: Node): string {
  if (isElement(node) && NON_VISIBLE.has(node.tagName)) return '';
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value;
  if (!('childNodes' in node)) return '';
  return (node as ParentNode).childNodes.map(visibleText).join(' ');
}

/** Parcours en profondeur des éléments HTML (hors SVG/MathML, hors <template>). */
function walk(node: Node, visit: (el: Element) => void): void {
  if (isElement(node)) {
    if (node.namespaceURI !== HTML_NS) return; // ex. <title> d'un SVG : ignoré
    visit(node);
    if (node.tagName === 'template') return; // contenu inerte
  }
  if ('childNodes' in node) {
    for (const child of (node as ParentNode).childNodes) walk(child, visit);
  }
}

export function extractSeoData(html: string): ExtractedData {
  const document = parse(html, { scriptingEnabled: true });

  const titles: string[] = [];
  const metaDescriptions: string[] = [];
  const h1: string[] = [];
  const h2: string[] = [];
  const canonicals: string[] = [];
  const robotsMeta: { name: string; content: string }[] = [];
  const missingAltExamples: string[] = [];
  let baseHref: string | null = null;
  let htmlLang: string | null = null;
  let imgTotal = 0;
  let missingAlt = 0;
  let emptyAlt = 0;
  let scriptCount = 0;
  let body: Element | null = null;

  walk(document, (el) => {
    switch (el.tagName) {
      case 'html':
        if (htmlLang === null) htmlLang = attr(el, 'lang');
        break;
      case 'body':
        body ??= el;
        break;
      case 'title':
        titles.push(normalizeText(textContent(el)));
        break;
      case 'meta': {
        const name = (attr(el, 'name') ?? '').trim().toLowerCase();
        const content = attr(el, 'content');
        if (name === 'description' && content !== null) metaDescriptions.push(normalizeText(content));
        if ((name === 'robots' || name === 'googlebot') && content !== null)
          robotsMeta.push({ name, content: normalizeText(content) });
        break;
      }
      case 'link': {
        const rel = (attr(el, 'rel') ?? '').toLowerCase().split(/\s+/);
        const href = attr(el, 'href');
        if (rel.includes('canonical') && href !== null) canonicals.push(href.trim());
        break;
      }
      case 'base':
        if (baseHref === null) baseHref = attr(el, 'href');
        break;
      case 'h1':
        h1.push(normalizeText(textContent(el)));
        break;
      case 'h2':
        h2.push(normalizeText(textContent(el)));
        break;
      case 'img': {
        imgTotal += 1;
        const alt = attr(el, 'alt');
        if (alt === null) {
          missingAlt += 1;
          const src = attr(el, 'src') ?? attr(el, 'data-src') ?? '(sans src)';
          if (missingAltExamples.length < 5) missingAltExamples.push(src.slice(0, 200));
        } else if (alt.trim() === '') {
          emptyAlt += 1;
        }
        break;
      }
      case 'script':
        scriptCount += 1;
        break;
    }
  });

  return {
    titles,
    metaDescriptions,
    h1,
    h2,
    images: { total: imgTotal, missingAlt, emptyAlt, missingAltExamples },
    canonicals,
    robotsMeta,
    baseHref,
    htmlLang,
    signals: {
      visibleTextLength: body ? normalizeText(visibleText(body)).length : 0,
      scriptCount,
    },
  };
}
