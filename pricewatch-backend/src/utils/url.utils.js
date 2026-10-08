import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { isPrivateIp } from './ip.utils.js';

export const normalizeDomain = (url) => new URL(url).hostname.toLowerCase().replace(/^www\./, '');

/** Validates a user-supplied URL and rejects anything that resolves to internal infrastructure. */
export async function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw AppError.unprocessable('Product URL is not a valid URL', 'INVALID_URL'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw AppError.unprocessable('Only http(s) URLs are allowed', 'INVALID_URL');
  if (u.username || u.password) throw AppError.unprocessable('URLs with credentials are not allowed', 'INVALID_URL');
  if (env.ALLOW_PRIVATE_URLS) return u;
  if (u.port && !['80', '443'].includes(u.port)) throw AppError.unprocessable('Non-standard ports are not allowed', 'INVALID_URL');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw AppError.unprocessable('URL host is not allowed', 'URL_NOT_ALLOWED');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => {
    throw AppError.unprocessable('Website host could not be resolved', 'HOST_UNRESOLVABLE');
  });
  if (addrs.some((a) => isPrivateIp(a.address))) throw AppError.unprocessable('URL host is not allowed', 'URL_NOT_ALLOWED');
  return u;
}
