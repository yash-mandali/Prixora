export function money(v, currency = 'INR') {
  if (v === null || v === undefined) return '—';
  try { return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v); }
  catch { return `${currency} ${v}`; }
}
export const dateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const toLocalInput = (d) => { // ISO -> value for <input type="datetime-local">
  if (!d) return '';
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
export const errorMessage = (err) => {
  const e = err?.response?.data?.error;
  if (e?.details?.length) return e.details.map((d) => d.message).join('. ');
  return e?.message || err?.message || 'Something went wrong';
};

/** Truncate long product names (keeps full text available via title attribute in the UI). */
export const shortName = (name, max = 32) => (!name ? '' : name.length > max ? `${name.slice(0, max).trimEnd()}…` : name);
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
export function timeAgo(d) {
  if (!d) return '—';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 0) return timeUntil(d);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export function timeUntil(d) {
  if (!d) return '—';
  const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
  if (s <= 60) return 'due now';
  if (s < 3600) return `in ${Math.floor(s / 60)}m`;
  if (s < 86400) return `in ${Math.floor(s / 3600)}h`;
  return `in ${Math.floor(s / 86400)}d`;
}
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
