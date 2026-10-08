# PriceWatch — Automated Product Price Monitoring Platform

React + Express + MongoDB + a separate background worker driving Playwright.

```
React (Vite) ──HTTPS/JWT──► Express API ──► MongoDB ◄── Worker (scheduler → atomic claim → Playwright)
```

## Requirements
- Node.js **22+**, MongoDB **5.2+** (uses `$top` in statistics), a machine that can run Chromium.

## Quick start (development)
```bash
# 1. Backend
cd pricewatch-backend
cp .env.example .env            # set MONGODB_URI and a JWT_SECRET (32+ chars)
npm install
npm run playwright:install      # downloads Chromium
npm run dev                     # API on :4000
# The API runs the worker in development by default. To run it separately instead,
# set RUN_WORKER_IN_API=false and start `npm run dev:worker` in another terminal.

# 2. Frontend
cd ../pricewatch-frontend
cp .env.example .env            # leave VITE_API_URL empty in dev (Vite proxies /api)
npm install
npm run dev                     # http://localhost:5173
```

## Docker
```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build   # mongo + api + worker
docker build -t pricewatch-web --build-arg VITE_API_URL=https://api.example.com/api ./pricewatch-frontend
```
Put both behind an HTTPS reverse proxy in production and set `CORS_ORIGINS` to the frontend origin.

## Tests
```bash
cd pricewatch-backend
npm test                                             # 25 unit tests, no DB needed
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/pw_test npm run test:integration   # needs a real MongoDB; drops that DB!
```
Unit tests cover strategies, price parsing, state machine, scheduling math, SSRF IP checks, extractor logic (fake page), factory, and worker resilience. Integration tests cover auth, cross-user authorization (404s), pause/resume/cancel, atomic claim under concurrency, end-date sweeps, and validation.

## How it works
- **Scheduling:** tasks store `nextCheckAt`, `intervalMinutes`, `startDate`, `endDate`. No document per future run. All dates UTC.
- **Worker loop** (`background/`): every `WORKER_POLL_INTERVAL_MS` it (1) sweeps lifecycle (Pending→Running, Running→Completed, Pending/Paused→Expired), then (2) claims due tasks with an atomic `findOneAndUpdate` + lease (`lockedBy/lockedUntil`) up to `MAX_CONCURRENT_JOBS`. Crashed workers self-heal when the lease expires.
- **Execution:** `executeTask` opens an isolated Playwright context, runs the domain's extractor, and on success writes `PriceHistory`, updates task stats (`$min/$max`), evaluates the strategy, and notifies (isolated try/catch). Failures write only a `MonitoringExecutions` row, back off exponentially, and mark the task `Failed` after `MAX_CONSECUTIVE_FAILURES` (or immediately for unsupported sites). A failed extraction is never stored as a price.
- **BullMQ later:** replace `monitoring.scheduler.js`; `claimNextTask()` / `executeTask()` are the only seams.
- **Statuses:** *Completed* = window ended while Running; *Expired* = window ended while Pending/Paused; *Failed* = repeated/permanent failure; *Cancelled* = user action (terminal).
- **Money** is stored as integer minor units (paise/cents); the API converts to/from decimals.
- **Notifications** alert on *transitions* (e.g. entering a range) and are idempotent via a unique `dedupeKey`. Email needs `SMTP_*`; without it email notifications are recorded as `Failed` and in-app still works.

## API
Exactly as specified: `/api/auth/*`, `/api/monitoring[/:id][/pause|resume|cancel|history|latest-price|statistics|executions[/:executionId]]`, `/api/dashboard/{summary,running,completed,alerts}`, `/api/notifications[/:id/read|/read-all]`. Success: `{data, meta}`; errors: `{error:{code,message,details?}}`. Other users' tasks return 404. `PUT /monitoring/:id` is only allowed for Pending/Paused monitors.

## Security notes
bcrypt (cost 12), JWT with only `sub`, helmet, CORS allow-list, body limit 10 KB, NoSQL-injection sanitizing, rate limits, ownership enforced in repositories, secrets validated at boot, log redaction, **SSRF guard** (http/https only, no credentials/odd ports, DNS-resolved private/metadata IPs rejected, every navigation incl. redirects re-checked), per-user monitor cap, min interval, per-domain request spacing.

## Honest limitations — read before production
1. **Retailer selectors are best-effort starting points** (`src/playwright/extractor.config.js`). Extraction also checks semantic price markup and common price attributes/classes, then JSON-LD/meta data; retailer markup still changes and should be verified against live pages. Flipkart hyperlocal links that show a preview without a price fall back to the standard product listing, whose price may differ from a local shop's price. The system never bypasses CAPTCHAs/blocks: it reports `ACCESS_BLOCKED` and backs off. Check each site's terms/robots policy before monitoring it.
2. **Integration tests were not executed** during the build (no MongoDB in the build sandbox); unit tests, the API boot smoke test, and the frontend production build were.
3. **Logout is client-side** (stateless JWT, 7-day default). For real revocation add a `tokenVersion` on the user or short-lived access + refresh tokens. The token is kept in `localStorage`; an httpOnly-cookie flow is more XSS-resistant.
4. Only **email + in-app** channels exist (add SMS/push via `src/notifications/`). Email requires SMTP settings.
5. No CI, no frontend tests, no pagination on `/dashboard/*` list endpoints (capped at 50).
