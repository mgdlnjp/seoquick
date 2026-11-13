import { describe, expect, it } from 'vitest';
import { validateUserUrl } from '../src/core/urlValidation';
import { isPublicIp } from '../server/fetch/ipPolicy';
import { assertFetchableUrl, createSafeLookup } from '../server/fetch/secureFetch';
import type { LookupFn } from '../server/fetch/secureFetch';
import { SeoQuickError } from '../src/core/types';

const PORTS = [80, 443];

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    return e instanceof SeoQuickError ? e.info.code : 'OTHER';
  }
}

describe('validateUserUrl — validation syntaxique', () => {
  it.each([
    ['exemple.fr', 'https://exemple.fr/'],
    ['http://exemple.fr/a?b=1#ancre', 'http://exemple.fr/a?b=1'],
    ['  https://Sous.Exemple.FR/Page  ', 'https://sous.exemple.fr/Page'],
    ['//exemple.fr/x', 'https://exemple.fr/x'],
  ])('accepte %s', (input, expected) => {
    const v = validateUserUrl(input);
    expect(v.ok && v.normalized).toBe(expected);
  });

  it.each([
    ['', 'INVALID_URL'],
    ['pas une url', 'INVALID_URL'],
    ['javascript:alert(1)', 'UNSUPPORTED_PROTOCOL'],
    ['file:///etc/passwd', 'UNSUPPORTED_PROTOCOL'],
    ['ftp://exemple.fr', 'UNSUPPORTED_PROTOCOL'],
    ['gopher://exemple.fr', 'UNSUPPORTED_PROTOCOL'],
    ['data:text/html,<h1>x</h1>', 'UNSUPPORTED_PROTOCOL'],
    ['https://user:pass@exemple.fr', 'CREDENTIALS_IN_URL'],
    ['http://localhost:3000', 'BLOCKED_HOST'],
    ['http://LOCALHOST.', 'BLOCKED_HOST'],
    ['http://app.localhost', 'BLOCKED_HOST'],
    ['http://imprimante.local', 'BLOCKED_HOST'],
    ['http://metadata.google.internal/computeMetadata/v1/', 'BLOCKED_HOST'],
    ['http://intranet', 'INVALID_URL'],
    [`https://exemple.fr/${'a'.repeat(2100)}`, 'INVALID_URL'],
  ])('refuse %s (%s)', (input, code) => {
    const v = validateUserUrl(input);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error.code).toBe(code);
  });

  it('refuse une valeur non textuelle', () => {
    expect(validateUserUrl(42).ok).toBe(false);
    expect(validateUserUrl(null).ok).toBe(false);
  });
});

describe('isPublicIp — plages interdites', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '0.0.0.0',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // métadonnées cloud
    '100.100.100.200', // métadonnées Alibaba (CGNAT)
    '192.0.0.192', // métadonnées Oracle
    '100.64.0.1',
    '192.0.2.10',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.5',
    '224.0.0.1',
    '239.255.255.250',
    '240.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    '::ffff:10.0.0.1',
    'fe80::1',
    'fc00::1',
    'fd00:ec2::254', // métadonnées AWS IPv6
    'ff02::1',
    '2001:db8::1',
    '2002:7f00:1::1', // 6to4 encapsulant 127.0.0.1
    '64:ff9b::7f00:1', // NAT64
    '2001::1', // Teredo
    'fec0::1',
    '0x7f.0.0.1',
    '127.1',
    'pas-une-ip',
  ])('bloque %s', (ip) => {
    expect(isPublicIp(ip)).toBe(false);
  });

  it.each(['93.184.215.14', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4007:80c::200e', '::ffff:8.8.8.8'])(
    'autorise %s',
    (ip) => {
      expect(isPublicIp(ip)).toBe(true);
    },
  );
});

describe('assertFetchableUrl — contrôles réseau avant requête', () => {
  it.each([
    ['http://127.0.0.1/', 'BLOCKED_HOST'],
    ['http://2130706433/', 'BLOCKED_HOST'], // 127.0.0.1 en décimal, normalisé par WHATWG URL
    ['http://0x7f000001/', 'BLOCKED_HOST'],
    ['http://017700000001/', 'BLOCKED_HOST'], // octal
    ['http://[::1]/', 'BLOCKED_HOST'],
    ['http://[::ffff:7f00:1]/', 'BLOCKED_HOST'],
    ['http://169.254.169.254/latest/meta-data/', 'BLOCKED_HOST'],
    ['http://[fd00:ec2::254]/', 'BLOCKED_HOST'],
    ['https://exemple.fr:8443/', 'BLOCKED_PORT'],
    ['http://exemple.fr:22/', 'BLOCKED_PORT'],
    ['http://exemple.fr:6379/', 'BLOCKED_PORT'],
  ])('refuse %s', (url, code) => {
    expect(codeOf(() => assertFetchableUrl(url, PORTS))).toBe(code);
  });

  it('accepte une URL publique sur un port standard', () => {
    expect(codeOf(() => assertFetchableUrl('https://exemple.fr/', PORTS))).toBeUndefined();
    expect(codeOf(() => assertFetchableUrl('http://exemple.fr:80/', PORTS))).toBeUndefined();
  });
});

describe('createSafeLookup — résolution DNS vérifiée', () => {
  const fakeResolver = (map: Record<string, string[]>): LookupFn =>
    ((host: string, _opts: unknown, cb: (e: Error | null, a: { address: string; family: number }[]) => void) => {
      const ips = map[host];
      if (!ips) return cb(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }), []);
      cb(null, ips.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })));
    }) as unknown as LookupFn;

  const run = (lookup: ReturnType<typeof createSafeLookup>, host: string, all = false) =>
    new Promise<{ err: unknown; address: unknown }>((resolve) =>
      lookup(host, { all }, (err, address) => resolve({ err, address })),
    );

  it('refuse un domaine qui résout vers une IP privée (DNS rebinding, *.nip.io…)', async () => {
    const lookup = createSafeLookup(fakeResolver({ 'evil.example.com': ['127.0.0.1'] }));
    const { err } = await run(lookup, 'evil.example.com');
    expect(err).toBeInstanceOf(SeoQuickError);
    expect((err as SeoQuickError).info.code).toBe('BLOCKED_HOST');
  });

  it('refuse si UNE SEULE des adresses résolues est interne', async () => {
    const lookup = createSafeLookup(fakeResolver({ 'mixed.example.com': ['93.184.215.14', '10.0.0.5'] }));
    const { err } = await run(lookup, 'mixed.example.com', true);
    expect((err as SeoQuickError).info.code).toBe('BLOCKED_HOST');
  });

  it('transmet les adresses validées pour la connexion', async () => {
    const lookup = createSafeLookup(fakeResolver({ 'ok.example.com': ['93.184.215.14'] }));
    expect((await run(lookup, 'ok.example.com')).address).toBe('93.184.215.14');
    expect((await run(lookup, 'ok.example.com', true)).address).toEqual([{ address: '93.184.215.14', family: 4 }]);
  });

  it('propage ENOTFOUND', async () => {
    const lookup = createSafeLookup(fakeResolver({}));
    const { err } = await run(lookup, 'inconnu.example.com');
    expect((err as NodeJS.ErrnoException).code).toBe('ENOTFOUND');
  });
});
