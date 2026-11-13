import type { AnalysisError } from './types';

/**
 * Validation syntaxique d'une URL saisie par un visiteur.
 * Partagée client/serveur. Le serveur ajoute ensuite les contrôles réseau
 * (résolution DNS, plages IP, ports) dans `server/fetch/ipPolicy.ts`.
 */

export const MAX_URL_LENGTH = 2048;

const FORBIDDEN_SCHEMES =
  /^(javascript|data|file|blob|about|vbscript|mailto|tel|ftp|ftps|sftp|ssh|gopher|ws|wss|dict|ldap|smb|chrome|view-source):/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Noms d'hôtes internes connus ou suffixes réservés (RFC 6761, 6762, 8375…). */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'instance-data.ec2.internal',
]);
const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.lan',
  '.home',
  '.corp',
  '.home.arpa',
  '.localdomain',
  '.test',
  '.invalid',
  '.example',
  '.onion',
  '.arpa',
];

export type UrlValidation =
  | { ok: true; url: URL; normalized: string }
  | { ok: false; error: AnalysisError };

function fail(code: AnalysisError['code'], message: string): UrlValidation {
  return { ok: false, error: { code, message } };
}

/** Retire les crochets d'un hôte IPv6 (`[::1]` → `::1`). */
export function bareHostname(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function looksLikeIp(host: string): boolean {
  return /^[\d.]+$/.test(host) || host.includes(':');
}

/**
 * Normalise et valide une URL saisie.
 * - Ajoute `https://` si aucun schéma n'est fourni (`exemple.fr` → `https://exemple.fr/`).
 * - N'autorise que http et https, sans identifiants.
 * - Rejette les hôtes manifestement internes.
 */
export function validateUserUrl(input: unknown): UrlValidation {
  if (typeof input !== 'string') return fail('INVALID_URL', 'Veuillez saisir une URL.');
  const trimmed = input.trim();
  if (!trimmed) return fail('INVALID_URL', 'Veuillez saisir une URL.');
  if (trimmed.length > MAX_URL_LENGTH)
    return fail('INVALID_URL', `L'URL dépasse ${MAX_URL_LENGTH} caractères.`);
  // eslint-disable-next-line no-control-regex -- rejet volontaire des caractères de contrôle
  if (/[\s\u0000-\u001f\u007f]/.test(trimmed))
    return fail('INVALID_URL', "L'URL ne doit pas contenir d'espaces ni de caractères de contrôle.");

  let candidate = trimmed;
  if (!HAS_SCHEME.test(candidate)) {
    if (FORBIDDEN_SCHEMES.test(candidate))
      return fail('UNSUPPORTED_PROTOCOL', 'Seules les adresses http:// et https:// sont acceptées.');
    if (candidate.startsWith('//')) candidate = candidate.slice(2);
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fail('INVALID_URL', "Cette adresse n'est pas une URL valide.");
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    return fail('UNSUPPORTED_PROTOCOL', 'Seules les adresses http:// et https:// sont acceptées.');
  if (url.username || url.password)
    return fail('CREDENTIALS_IN_URL', "Les URL contenant un identifiant ou un mot de passe sont refusées.");

  const host = bareHostname(url.hostname.toLowerCase()).replace(/\.$/, '');
  if (!host) return fail('INVALID_URL', "L'URL ne contient pas de nom de domaine.");
  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)))
    return fail('BLOCKED_HOST', "Cette adresse pointe vers un réseau interne ou réservé : elle ne peut pas être analysée.");
  if (!looksLikeIp(host) && !host.includes('.'))
    return fail('INVALID_URL', 'Le nom de domaine semble incomplet (ex. : exemple.fr).');

  url.hash = '';
  return { ok: true, url, normalized: url.href };
}
