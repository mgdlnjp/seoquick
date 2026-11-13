/**
 * Pré-rendu statique : génère le HTML complet de chaque page (contenu + balises head)
 * pour que la landing soit lisible sans JavaScript, puis robots.txt et sitemap.xml.
 * Prérequis : `vite build` (dist/) et `vite build --ssr` (dist-ssr/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// Lecture de VITE_SITE_URL depuis l'environnement ou .env (sans dépendance).
function readEnv(key) {
  if (process.env[key]) return process.env[key];
  for (const file of ['.env.production', '.env']) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    const m = new RegExp(`^${key}=(.*)$`, 'm').exec(fs.readFileSync(p, 'utf8'));
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const siteUrl = (readEnv('VITE_SITE_URL') ?? 'https://example.com').replace(/\/$/, '');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const { render, renderHead, ROUTES } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);

function page(routePath) {
  let html = template
    .replace('<!--app-head-->', renderHead(routePath, siteUrl))
    .replace('<!--app-html-->', render(routePath));
  if (routePath === null) html = html.replace('<div id="root">', '<div id="root" data-not-found="true">');
  return html;
}

for (const route of ROUTES) {
  const out = path.join(dist, route.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page(route.path));
  console.log(`prerender ${route.path} → ${path.relative(root, out)}`);
}
fs.writeFileSync(path.join(dist, '404.html'), page(null));

fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROUTES.filter((r) => !r.noindex).map(
    (r) => `  <url><loc>${siteUrl}${r.path}</loc></url>`,
  ).join('\n')}\n</urlset>\n`,
);
console.log(`robots.txt + sitemap.xml (${siteUrl})`);
