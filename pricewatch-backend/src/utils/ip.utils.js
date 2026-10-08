import net from 'node:net';

function v4ToInt(ip) {
  return ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}
const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => ({ base: v4ToInt(base), mask: (~0 << (32 - bits)) >>> 0 }));

/** True for loopback/private/link-local/metadata/multicast/reserved addresses (SSRF guard). */
export function isPrivateIp(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const n = v4ToInt(ip);
    return V4_BLOCKS.some((b) => ((n & b.mask) >>> 0) === b.base);
  }
  if (kind === 6) {
    const l = ip.toLowerCase();
    if (l === '::' || l === '::1') return true;
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^(fc|fd)/.test(l) || /^fe[89ab]/.test(l) || l.startsWith('ff');
  }
  return true; // unknown format => treat as unsafe
}
