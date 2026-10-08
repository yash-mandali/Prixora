// Per-domain minimum spacing between requests (politeness + avoids hammering one site).
const nextSlot = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitTurn(domain, gapMs) {
  if (!gapMs) return;
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(domain) || 0);
  nextSlot.set(domain, slot + gapMs);
  if (slot > now) await sleep(slot - now);
}
