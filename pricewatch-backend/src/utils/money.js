// Money is stored as integer minor units (paise/cents) to avoid floating-point errors.
export const toMinor = (v) => (v === undefined || v === null || v === '' ? undefined : Math.round(Number(v) * 100));
export const fromMinor = (v) => (v === undefined || v === null ? null : v / 100);

export function formatMoney(minor, currency = 'INR') {
  if (minor == null) return '-';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}
