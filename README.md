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

Single project, three services:

1. **PostgreSQL** plugin — injects `DATABASE_URL` into the others.
2. **web** service: Connect to GitHub repo → Railway runs `npm run build`, then `npm start` (which applies migrations and starts Next.js).
3. **worker** service: Same repo, override start command to `npm run worker`.

Generate a domain on `web` → set `APP_URL` to that domain in both services' env.

Health check: `/api/health` (already configured in `railway.json`).

## Logo

Place the ministry logo at `public/brand/ministry-of-media.png`. The seeded organisation references it from there.

## Stack

Next.js 15 · TypeScript · Tailwind · Radix · Prisma · PostgreSQL · pg-boss · React Email · next-intl · Playwright

## Full spec

See [BUILD.md](./BUILD.md) for the complete product and architecture spec (24 sections).
