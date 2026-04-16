# RSVP App — Ministry of Media

Premium, bilingual (English + Arabic) invitation and RSVP system. Mock-first: the full send → deliver → open → click → RSVP loop runs with no external credentials.

## Client

Saudi Ministry of Media (وزارة الإعلام). Brand accent `#009B87`. Arabic-first.

## Quickstart (local)

1. Copy env file:
   ```
   cp .env.example .env
   # edit AUTH_SECRET, TOKEN_SIGNING_SECRET, WEBHOOK_SHARED_SECRET with random 32-byte hex
   ```
2. Start Postgres (any method — Docker, local install, Railway).
3. Install, migrate, seed:
   ```
   npm install
   npm run prisma:migrate      # applies schema
   npm run seed                # creates demo org, users, templates, event, guests
   ```
4. Run web + worker in two terminals:
   ```
   npm run dev           # web on :3000
   npm run worker:dev    # queue consumer
   ```
5. Sign in at http://localhost:3000 with:
   - `owner@example.com` / `demo-password`

## The mock loop

1. Open the seeded event → **Compose** → pick default AR email template → **Send now**.
2. Watch **Delivery** populate as the worker fans out messages. Rendered HTML is also written to `./.mock-outbox/*.html`.
3. Tap an RSVP link (from logs or the mock outbox) → accept → **Overview** reflects the new response within a second.

## Switching to live providers

Set env vars on the host (e.g. Railway) and redeploy. No code change.

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=…
TWILIO_AUTH_TOKEN=…
TWILIO_MESSAGING_SERVICE_SID=…
TWILIO_WEBHOOK_SIGNING_KEY=…

EMAIL_PROVIDER=resend
RESEND_API_KEY=…
RESEND_WEBHOOK_SECRET=…
EMAIL_FROM_DEFAULT="Ministry of Media <events@your-domain.sa>"
```

Register provider webhooks:
- `{APP_URL}/api/webhooks/sms/twilio`
- `{APP_URL}/api/webhooks/email/resend`

The Twilio and Resend adapters are stubs that need filling in (`src/providers/sms/twilio.ts`, `src/providers/email/resend.ts`).

## Deploy — Railway

Single project, three services. **Order matters**: create Postgres first so `DATABASE_URL` is available when the web service starts.

1. **Create Postgres first.** New Project → `+ New` → **Database → PostgreSQL**. Railway exposes `DATABASE_URL` as a reference variable.
2. **Web service:** `+ New → GitHub Repo` → `Balmung-/rsvp-app`. In the service Variables tab, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway reference syntax)
   - `AUTH_SECRET` — run `openssl rand -hex 32` and paste
   - `TOKEN_SIGNING_SECRET` — another random 32-byte hex
   - `WEBHOOK_SHARED_SECRET` — another random 32-byte hex
   - `APP_URL` — set after generating a domain (next step)
   - (plus everything else from `.env.example`, leave provider credentials blank for mock mode)

   Settings → Networking → **Generate Domain**. Paste that URL into `APP_URL`.

3. **Worker service:** `+ New → Empty Service` → Source → GitHub Repo → same `Balmung-/rsvp-app`. Settings → Deploy → **Custom Start Command**: `npm run worker`. Variables: same `DATABASE_URL` reference and same secrets as web. No healthcheck needed.

4. Push any commit to `main` → both services redeploy automatically. The web service applies migrations on boot (`prisma migrate deploy`), then starts Next.js.

Health check: `/api/health` returns `200` as long as the process is responsive; DB status is reported in the body. `/api/ready` is the DB-strict readiness probe.

### If deploy fails the healthcheck

Check the **Deploy Logs** (not Build Logs) for the web service.
- `P1001: Can't reach database server` — `DATABASE_URL` not set or wrong reference. Confirm the Postgres service exists and the variable is `${{Postgres.DATABASE_URL}}`.
- `Environment variable not found: AUTH_SECRET` — set the secret in the web service Variables.
- `migrate deploy` reports pending migrations — it applies them automatically on next boot.

### If the build fails with `<Html> should not be imported outside of pages/_document`

You have `NODE_ENV` set in the service Variables. Delete it. `next build` auto-sets `NODE_ENV=production`; overriding it (especially to `development`) pulls in dev-only Next.js code that references `next/document` Html, which then breaks prerender of `/404`.

## Logo

Place the ministry logo at `public/brand/ministry-of-media.png`. The seeded organisation references it from there.

## Features

**Workspaces**
- Events index + per-event workspace (Overview, Guests, Compose, Delivery, Responses)
- Top-level Campaigns panel — every campaign across the org with delivery metrics
- Top-level Guests directory — org-wide, dedup'd by email/phone, search, event count

**Editing**
- Edit any event (side sheet from workspace header) + delete
- Edit / create / delete templates (per channel + locale, with default toggle)
- Edit organisation brand (name, accent picker, logo, defaults, support contacts)
- Change password from Settings → Account

**Sending**
- Compose: channel + locale + template + audience + schedule (now or later) + live preview
- Test-send: ship one preview message to your email or phone before a full blast
- One-click "Nudge non-responders" on the Responses tab
- pg-boss queue, monotonic status machine, retries with backoff

**Importing**
- Drag-drop or click to upload .csv / .xlsx
- Auto-mapped columns (English + Arabic header detection)
- Live preview with per-column dropdowns
- Server-side dedup by (org, email) and (org, phone), phones normalised to E.164

**Reporting**
- CSV export per status (accepted / declined / pending / all) with UTF-8 BOM for Excel
- Per-invitee detail: contact, RSVP history, message history, copy current link, rotate token
- Recent activity feed on the event overview

**Compliance**
- Email unsubscribe link in every send → /u/{token} page → Suppression auto-add
- Manual suppression management (Settings → Suppressions): add, list, remove
- Suppressions checked at dispatch time on every channel
- Per-IP rate limit on /api/rsvp and webhook ingestion

**Operational**
- /api/_diag returns DB + env + seed state for fast triage
- /api/health (always 200 if process is up) + /api/ready (DB-strict)
- Webhook URLs for each provider displayed in Settings → Channels
- Audit log written for every admin mutation

**Internationalisation**
- Arabic + English first-class, RTL on public RSVP and email
- Locale auto-detected from invitee.preferredLocale → org default → header

## Stack

Next.js 15 · TypeScript · Tailwind · Radix · Prisma · PostgreSQL · pg-boss · next-intl · Playwright · SheetJS

## Full spec

See [BUILD.md](./BUILD.md) for the complete product and architecture spec (24 sections).
