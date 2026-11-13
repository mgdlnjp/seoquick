# SEOQuick

Micro-SaaS de **vérification SEO on-page** : à partir d'une URL publique, SEOQuick récupère le HTML initial de la page (côté serveur) et produit un diagnostic simple et honnête : 8 contrôles avec statut et explication, score indicatif sur 100 au barème public, 3 à 5 recommandations triées par impact et facilité, résumé copiable.

> Ce n'est pas un crawler : une seule URL, HTML initial uniquement (JavaScript non exécuté).

## Démarrage

```bash
npm install            # .npmrc active legacy-peer-deps (bug npm/arborist avec vitest 5)
cp .env.example .env   # optionnel, valeurs par défaut sûres
npm run dev            # API http://127.0.0.1:8787 + front Vite http://localhost:5173 (proxy /api)
```

Production (un seul processus Node sert l'API et le site pré-rendu) :

```bash
npm run build          # typecheck + build client + SSR + pré-rendu + bundle serveur
npm start              # http://0.0.0.0:8787
```

Qualité :

```bash
npm test               # vitest (parsing, score, URL interdites, fetch sécurisé, API, rate limit)
npm run lint
npm run typecheck
```

## Architecture

```
src/core/                 Moteur pur TS, partagé serveur / mode démo (aucune dépendance DOM ni Node)
  urlValidation.ts        Validation syntaxique (http/https, identifiants, hôtes internes)
  extract.ts              Parsing HTML (parse5, algorithme WHATWG) → données brutes
  rules.ts                Règles d'audit + barème (CHECK_DEFINITIONS = source unique affichée sur le site)
  score.ts                Calcul du score (règle documentée)
  recommendations.ts      Recommandations triées impact → facilité
  analyze.ts              Pipeline HTML → résultat + avertissements
  summary.ts              Résumé texte copiable
  types.ts                Types stricts (résultats, erreurs structurées)
server/
  fetch/ipPolicy.ts       Politique IP anti-SSRF (IPv4/IPv6)
  fetch/secureFetch.ts    Récupération sécurisée (DNS vérifié, redirections, taille, délais)
  http/rateLimit.ts       Limitation de fréquence + concurrence
  app.ts / index.ts       Express : POST /api/analyze, GET /api/health, fichiers statiques
src/components, src/pages Présentation React (Tailwind v4)
src/demo/                 HTML d'exemple fictif + analyse locale (chargée à la demande)
scripts/prerender.mjs     Pré-rendu SSR des pages + robots.txt + sitemap.xml
```

## Score

`score = arrondi(points obtenus ÷ points maximum des contrôles vérifiables × 100)`

| Contrôle | Max | Barème |
|---|---|---|
| Title | 20 | 20 si unique et 30–60 car. · 15 hors repère · 10 si plusieurs · 0 absent/vide |
| Meta description | 15 | 15 si unique et 70–160 car. · 11 hors repère · 8 si plusieurs · 0 absente/vide |
| H1 | 15 | 15 unique non vide · 10 plusieurs · 4 vide · 0 absent |
| H2 | 10 | 10 si ≥ 1 · 0 sinon |
| Alt des images | 15 | 15 × (1 − (sans alt + ½ alt vide) ÷ total) · non compté si aucune image |
| Canonical | 10 | 10 cohérente · 5 ailleurs/plusieurs · 3 invalide · 0 absente |
| Robots | 10 | 10 sans restriction · 5 nofollow · 0 noindex/none (meta + en-tête X-Robots-Tag) |
| Langue | 5 | 5 lang valide · 2 mal formé · 0 absent |

Les repères de longueur sont des conseils éditoriaux, pas des pénalités Google. Le score est pédagogique, déterministe et n'est pas une mesure de Google.

## Sécurité de la route d'analyse (SSRF)

- Schémas `http`/`https` uniquement ; URL avec identifiants refusées ; longueur ≤ 2048.
- Hôtes internes refusés par nom (`localhost`, `*.local`, `*.internal`, `metadata.google.internal`…).
- **Résolution DNS dans un `lookup` personnalisé** : toutes les adresses résolues doivent être publiques et c'est l'adresse validée qui est utilisée pour la connexion (pas de seconde résolution → pas de DNS rebinding). IP littérales (y compris formes décimales/hexadécimales/octales normalisées) vérifiées avant connexion ; adresse distante revérifiée à la connexion.
- Plages bloquées : privées, loopback, link-local, CGNAT, multicast, réservées, documentation, benchmark, IPv4-mapped, NAT64, 6to4, Teredo, ULA, site-local… IPv6 limité à `2000::/3`. Métadonnées cloud (169.254.169.254, fd00:ec2::254, 100.100.100.200, 192.0.0.192) incluses.
- Redirections suivies manuellement, **chaque saut entièrement revalidé**, 5 maximum.
- Ports 80/443 uniquement (`ALLOWED_PORTS`).
- Délai global 10 s + inactivité socket 4 s ; taille max 3 Mo **après décompression** (anti bombe gzip).
- Aucun cookie, aucun en-tête d'authentification, pas d'agent keep-alive partagé, user-agent explicite.
- 10 analyses/minute/IP + 8 récupérations simultanées max ; corps de requête ≤ 4 Ko.
- `ENABLE_LIVE_FETCH=false` désactive l'analyse réelle (seul le mode démo reste).

## Variables d'environnement

Voir `.env.example`. Principales : `PORT`, `ENABLE_LIVE_FETCH`, `USER_AGENT`, `FETCH_TIMEOUT_MS`, `CONNECT_TIMEOUT_MS`, `MAX_RESPONSE_BYTES`, `MAX_REDIRECTS`, `ALLOWED_PORTS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `MAX_CONCURRENT_FETCHES`, `TRUST_PROXY`, `SERVE_STATIC`. Au build : `VITE_SITE_URL` (canonical, Open Graph, sitemap), `VITE_DEMO_ONLY`.

Une configuration invalide fait échouer le démarrage avec un message explicite.

## Déploiement

1. Hébergeur Node ≥ 20 (Render, Railway, Fly.io, VPS…). Build : `npm ci && npm run build` ; start : `npm start`.
2. Définir `VITE_SITE_URL` **avant le build**, `USER_AGENT` avec une URL de contact réelle, et `TRUST_PROXY=1` derrière un reverse proxy (sinon toutes les requêtes partagent la même IP de rate limit).
3. Compléter les pages `/mentions-legales/` et `/confidentialite/` (mentions entre crochets).
4. Recommandé : règles d'egress réseau au niveau de l'hébergeur (interdire l'accès au VPC / métadonnées) en défense en profondeur.
5. Version statique sans serveur : `VITE_DEMO_ONLY=true npm run build` puis publier `dist/` (mode démo uniquement).

## Limites connues

- HTML initial uniquement : contenu injecté en JavaScript invisible (un avertissement est affiché si la page semble rendue côté client).
- Une seule URL ; robots.txt, sitemap, liens, performances, données structurées non analysés.
- Rate limit en mémoire : par instance, remis à zéro au redémarrage (utiliser Redis ou le proxy en multi-instances).
- Pages > 3 Mo refusées plutôt qu'analysées partiellement.
- Certains sites bloquent les robots (403, Cloudflare…) : une erreur explicite est alors affichée.
- Pas d'image Open Graph (`og:image`) fournie : à ajouter (PNG 1200×630) dans `public/` et `src/entry-server.tsx`.
- robots.txt du site analysé non consulté (requête unique déclenchée par l'utilisateur, comme un navigateur).

## Abonnement (Stripe)

SEOQuick peut proposer un forfait Pro, sur le modèle de Text2Action : quelques analyses d'URL gratuites, puis abonnement via Stripe Checkout, sans compte utilisateur. Le mode démo reste gratuit et illimité.

- **Gratuit :** `FREE_USES_PER_DAY` analyses (3 par défaut) par IP sur 24 h glissantes, **vérifiées par le serveur**. Une analyse en échec n'est pas décomptée.
- **Pro :** au retour de Stripe, la page pré-rendue `/abonnement/` (noindex, exclue du sitemap) appelle `POST /api/billing/activate`. Le serveur vérifie la session chez Stripe et délivre un jeton HMAC de 7 jours, stocké dans `localStorage` (pas de cookie) et envoyé en `Authorization: Bearer`.
- **Renouvellement :** `/api/billing/refresh` exige l'ancien jeton signé et revérifie l'abonnement chez Stripe.
- **Gestion et résiliation :** le lien « Gérer l'abonnement » ouvre le portail client Stripe.
- **Sans Stripe configuré** (ou avec `VITE_DEMO_ONLY=true`) : aucune mention de l'abonnement n'apparaît.

**Mise en place :** créez un produit avec un prix récurrent dans Stripe, activez le portail client (Paramètres → Facturation → Portail client), puis renseignez `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `ACCESS_TOKEN_SECRET` et `APP_URL`. Testez avec `sk_test_…` et la carte `4242 4242 4242 4242`.

**Limites :** l'accès Pro est lié au navigateur ; il reste actif jusqu'à 7 jours après une résiliation ; le quota par IP est en mémoire (une seule instance, IP partagées).
