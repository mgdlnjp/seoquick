import net from 'node:net';
import ipaddr from 'ipaddr.js';

/**
 * Politique d'adresses IP de destination (anti-SSRF).
 *
 * Une adresse est autorisée uniquement si :
 *  1. ipaddr.js la classe en « unicast » (exclut private, loopback, linkLocal,
 *     multicast, reserved, carrierGradeNat, uniqueLocal, unspecified, broadcast…) ;
 *  2. elle n'appartient à aucune plage de la liste explicite ci-dessous
 *     (défense en profondeur, indépendante de la version d'ipaddr.js) ;
 *  3. en IPv6, elle appartient à 2000::/3 (seul espace unicast global).
 * Les IPv4 encapsulées en IPv6 (::ffff:a.b.c.d) sont évaluées comme IPv4.
 */

const BLOCKED_V4 = [
  '0.0.0.0/8', // « ce réseau »
  '10.0.0.0/8', // privé
  '100.64.0.0/10', // CGNAT (inclut 100.100.100.200, métadonnées Alibaba)
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local (inclut 169.254.169.254, métadonnées AWS/GCP/Azure)
  '172.16.0.0/12', // privé
  '192.0.0.0/24', // IETF protocol assignments (inclut 192.0.0.192 métadonnées Oracle)
  '192.0.2.0/24', // TEST-NET-1
  '192.31.196.0/24', // AS112
  '192.52.193.0/24', // AMT
  '192.88.99.0/24', // relais 6to4
  '192.168.0.0/16', // privé
  '192.175.48.0/24', // AS112
  '198.18.0.0/15', // benchmark
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24', // TEST-NET-3
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // réservé + broadcast
].map((c) => ipaddr.IPv4.parseCIDR(c));

const BLOCKED_V6 = [
  '::/128',
  '::1/128',
  '::ffff:0:0/96', // IPv4-mapped (traité à part)
  '64:ff9b::/96', // NAT64
  '64:ff9b:1::/48', // NAT64 local
  '100::/64', // discard
  '2001::/23', // IETF (Teredo, ORCHID…)
  '2001:db8::/32', // documentation
  '2002::/16', // 6to4 (encapsule une IPv4 arbitraire)
  '3fff::/20', // documentation
  '5f00::/16', // SRv6
  'fc00::/7', // unique local (inclut fd00:ec2::254, métadonnées AWS IPv6)
  'fe80::/10', // link-local
  'fec0::/10', // site-local (obsolète)
  'ff00::/8', // multicast
].map((c) => ipaddr.IPv6.parseCIDR(c));

const GLOBAL_UNICAST_V6 = ipaddr.IPv6.parseCIDR('2000::/3');

export function isPublicIp(ip: string): boolean {
  // net.isIP refuse les formes exotiques ("0x7f.1", "127.1"…) qu'ipaddr.js accepterait.
  if (net.isIP(ip) === 0 || !ipaddr.isValid(ip)) return false;
  let addr: ipaddr.IPv4 | ipaddr.IPv6 = ipaddr.parse(ip);

  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) addr = v6.toIPv4Address();
    else if (v6.zoneId) return false; // adresse avec zone (fe80::1%eth0)
  }

  if (addr.range() !== 'unicast') return false;

  if (addr.kind() === 'ipv4') {
    const v4 = addr as ipaddr.IPv4;
    return !BLOCKED_V4.some((cidr) => v4.match(cidr));
  }
  const v6 = addr as ipaddr.IPv6;
  if (!v6.match(GLOBAL_UNICAST_V6)) return false;
  return !BLOCKED_V6.some((cidr) => v6.match(cidr));
}
