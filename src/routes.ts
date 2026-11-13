/** Pages du site, avec leurs métadonnées SEO (utilisées au pré-rendu et côté client). */
export interface RouteMeta {
  path: '/' | '/confidentialite/' | '/mentions-legales/' | '/abonnement/';
  title: string;
  description: string;
  /** Page utilitaire : exclue du sitemap et marquée noindex. */
  noindex?: boolean;
}

export const ROUTES: readonly RouteMeta[] = [
  {
    path: '/',
    title: 'Audit SEO gratuit : analysez une page web en quelques secondes | SEOQuick',
    description:
      'Vérification SEO on-page gratuite : title, meta description, titres H1/H2, attributs alt, canonical, robots et langue. Diagnostic clair, score expliqué, sans inscription.',
  },
  {
    path: '/confidentialite/',
    title: 'Politique de confidentialité | SEOQuick',
    description: 'Quelles données SEOQuick traite lorsque vous analysez une page web, pourquoi et combien de temps.',
  },
  {
    path: '/mentions-legales/',
    title: 'Mentions légales | SEOQuick',
    description: 'Mentions légales du service SEOQuick : éditeur, hébergeur et contact.',
  },
  {
    path: '/abonnement/',
    title: 'Abonnement | SEOQuick',
    description: 'Activation de votre abonnement SEOQuick Pro.',
    noindex: true,
  },
];

/** `/confidentialite` et `/confidentialite/` désignent la même page. */
export function normalizePath(pathname: string): RouteMeta['path'] | null {
  const p = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return ROUTES.find((r) => r.path === p)?.path ?? null;
}

export function routeFor(path: RouteMeta['path']): RouteMeta {
  return ROUTES.find((r) => r.path === path) ?? ROUTES[0]!;
}
