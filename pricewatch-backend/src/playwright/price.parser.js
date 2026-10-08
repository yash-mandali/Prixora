const SYMBOLS = { '₹': 'INR', 'rs.': 'INR', 'rs': 'INR', 'inr': 'INR', '$': 'USD', 'usd': 'USD', '€': 'EUR', 'eur': 'EUR', '£': 'GBP', 'gbp': 'GBP' };
const MAX_MINOR = 1e12;

function detectCurrency(text) {
  const t = text.toLowerCase();
  for (const [sym, cur] of Object.entries(SYMBOLS)) {
    if (sym === 'rs' || sym === 'rs.') {
      if (/(^|[^a-z])rs\.?(?=\s|\d|$)/i.test(t)) return cur;
    } else if (sym.length === 3) {
      if (new RegExp(`\\b${sym}\\b`, 'i').test(t)) return cur;
    } else if (t.includes(sym)) {
      return cur;
    }
  }
  return null;
}

/**
 * Parse a displayed price into integer minor units. Returns null when it cannot be parsed reliably.
 * Handles "₹1,29,999.00", "Rs. 999", "$1,299.50", "1.299,50 €".
 */
export function parsePrice(text, fallbackCurrency = 'INR') {
  if (text == null) return null;
  const raw = String(text);
  const currencyPrefix = raw.match(/(?:₹|\$|€|£|\b(?:rs\.?|inr|usd|eur|gbp)\b)\s*(\d[\d.,]*)/i);
  const currencySuffix = raw.match(/(\d[\d.,]*)\s*(?:€|£|\b(?:eur|gbp)\b)/i);
  const numberMatch = currencyPrefix
    ? { 0: currencyPrefix[1], index: currencyPrefix.index + currencyPrefix[0].lastIndexOf(currencyPrefix[1]) }
    : currencySuffix
      ? { 0: currencySuffix[1], index: currencySuffix.index }
      : raw.match(/\d[\d.,]*/);
  if (!numberMatch) return null;
  const start = numberMatch.index;
  const prefix = raw.slice(0, start).trimEnd();
  if (/[-−]\s*(?:(?:₹|\$|€|£)|(?:rs\.?|inr|usd|eur|gbp))?\s*$/i.test(prefix)
    || /(?:₹|\$|€|£|(?:rs\.?|inr|usd|eur|gbp))\s*[-−]\s*$/i.test(prefix)) return null;
  let num = numberMatch[0].replace(/[.,]+$/g, '');
  if (!num) return null;
  const lastDot = num.lastIndexOf('.');
  const lastComma = num.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandSep = decimalSep === '.' ? ',' : '.';
    num = num.split(thousandSep).join('').replace(decimalSep, '.');
  } else if (lastComma >= 0) {
    const after = num.length - lastComma - 1;
    num = after >= 1 && after <= 2 && num.split(',').length === 2
      ? num.replace(',', '.')
      : num.split(',').join('');
  } else if (lastDot >= 0 && num.split('.').length > 2) {
    num = num.split('.').join(''); // multiple dots => thousand separators
  } else if (lastDot >= 0 && num.length - lastDot - 1 === 3) {
    num = num.replace('.', '');
  }
  const value = Number(num);
  if (!Number.isFinite(value) || value <= 0) return null;
  const minor = Math.round(value * 100);
  if (minor <= 0 || minor > MAX_MINOR) return null;
  return { minor, currency: detectCurrency(raw) || fallbackCurrency };
}
