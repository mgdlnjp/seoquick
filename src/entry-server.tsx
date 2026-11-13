import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { FAQ } from './content/faq';
import { ROUTES, routeFor } from './routes';
import type { RouteMeta } from './routes';

/** Utilisé uniquement au build (scripts/prerender.mjs) pour générer du HTML statique. */
export { ROUTES };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON dans <script> : on neutralise "<" pour empêcher toute fermeture prématurée. */
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

export function renderHead(path: RouteMeta['path'] | null, siteUrl: string): string {
  const site = siteUrl.replace(/\/$/, '');
  if (path === null)
    return ['<title>Page introuvable | SEOQuick</title>', '<meta name="robots" content="noindex">'].join('\n    ');

  const route = routeFor(path);
  const url = `${site}${route.path}`;
  const tags = [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="SEOQuick">`,
    `<meta property="og:locale" content="fr_FR">`,
    `<meta property="og:title" content="${escapeHtml(route.title)}">`,
    `<meta property="og:description" content="${escapeHtml(route.description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta name="twitter:card" content="summary">`,
  ];
  if (route.noindex) tags.push('<meta name="robots" content="noindex">');
  if (path === '/') {
    const app = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SEOQuick',
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'fr',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      description: route.description,
    };
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    };
    tags.push(`<script type="application/ld+json">${safeJson(app)}</script>`);
    tags.push(`<script type="application/ld+json">${safeJson(faq)}</script>`);
  }
  return tags.join('\n    ');
}

export function render(path: RouteMeta['path'] | null): string {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  );
}
