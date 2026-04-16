# RSVP App — Build Sheet v1

## 0. Mission

A premium, bilingual (English + Arabic) invitation and RSVP system for a Saudi client. The product is a controlled invitation engine with branded SMS + email delivery, tokenized web RSVP, and calm event-centric administration. It must be fully functional in mock mode on day one with zero credentials, and must switch to live mode by adding provider keys. The surface is minimal; the engine is strong. Event workspace is the center of gravity — not a dashboard.

## 1. Decisions (locked)

- **Host:** Railway. Single project, three services: `web` (Next.js), `worker` (pg-boss consumer), `postgres`.
- **Framework:** Next.js 15 App Router, TypeScript strict, React Server Components by default.
- **DB/ORM:** PostgreSQL 16, Prisma 5.
- **Queue:** pg-boss on the same Postgres (schema `pgboss`).
- **UI primitives:** Radix UI. Compose our own components on top — do not install shadcn CLI; we want control over class names and tokens. Tailwind for styling.
- **i18n:** next-intl. Locales: `en`, `ar`. `ar` is RTL.
- **Email rendering:** React Email → rendered to HTML + plain-text on the server at send time.
- **Validation:** Zod at every boundary (forms, API routes, webhook payloads, provider adapters).
- **Auth:** Auth.js v5 (credentials provider + email magic link; session in DB).
- **Timezone:** `Asia/Riyadh` default; per-event override. Store UTC, render in event tz.
- **Token model:** HMAC-signed opaque RSVP tokens with per-invitee version for rotation.
- **Tests:** Playwright for critical flows; Vitest for unit.
- **No third-party shorteners.** All tracked links are first-party `/r/{token}`.
- **No analytics SDKs.** Practical per-event metrics only.
- **Mock-first:** full flow — compose → send → deliver → open → click → RSVP → track — runs with no external credentials.

## 2. Stack & Versions

```
next            ^15.0.0
react           ^18.3.0
typescript      ^5.4.0
prisma          ^5.18.0
@prisma/client  ^5.18.0
tailwindcss     ^3.4.0
@radix-ui/*     latest stable
zod             ^3.23.0
next-intl       ^3.17.0
next-auth       ^5.0.0-beta
pg-boss         ^10.0.0
react-email     ^3.0.0
@react-email/components ^0.0.25
libphonenumber-js ^1.11.0
papaparse       ^5.4.0
cmdk            ^1.0.0
bcryptjs        ^2.4.3
date-fns-tz     ^3.1.0
playwright      ^1.46.0
vitest          ^2.0.0
```

## 3. Repository layout

```
/
├─ app/
│  ├─ (admin)/
│  │  ├─ layout.tsx                 # admin shell
│  │  ├─ events/
│  │  │  ├─ page.tsx                # events index
│  │  │  └─ [eventId]/
│  │  │     ├─ layout.tsx           # event workspace shell w/ segmented nav
│  │  │     ├─ page.tsx             # Overview
│  │  │     ├─ guests/page.tsx
│  │  │     ├─ compose/page.tsx
│  │  │     ├─ delivery/page.tsx
│  │  │     └─ responses/page.tsx
│  │  ├─ templates/page.tsx
│  │  └─ settings/
│  │     ├─ brand/page.tsx
│  │     ├─ channels/page.tsx
│  │     ├─ team/page.tsx
│  │     └─ retention/page.tsx
│  ├─ (auth)/
│  │  ├─ sign-in/page.tsx
│  │  └─ magic/[token]/page.tsx
│  ├─ r/[token]/                    # public RSVP
│  │  ├─ page.tsx                   # invite page
│  │  ├─ confirm/page.tsx           # post-accept
│  │  └─ declined/page.tsx
│  ├─ api/
│  │  ├─ webhooks/
│  │  │  ├─ sms/[provider]/route.ts
│  │  │  └─ email/[provider]/route.ts
│  │  ├─ rsvp/route.ts              # POST submit
│  │  ├─ track/open/[id]/route.ts   # 1x1 gif
│  │  ├─ track/click/[token]/route.ts
│  │  └─ ... (admin routes below)
│  ├─ layout.tsx                    # root layout, locale, theme vars
│  └─ globals.css
├─ src/
│  ├─ domain/                       # pure domain logic
│  │  ├─ events/
│  │  ├─ guests/
│  │  ├─ campaigns/
│  │  ├─ messages/
│  │  ├─ rsvp/
│  │  └─ tokens/
│  ├─ providers/                    # adapter layer
│  │  ├─ types.ts
│  │  ├─ registry.ts
│  │  ├─ sms/
│  │  │  ├─ mock.ts
│  │  │  └─ twilio.ts               # stub
│  │  └─ email/
│  │     ├─ mock.ts
│  │     └─ resend.ts               # stub
│  ├─ queue/
│  │  ├─ boss.ts
│  │  └─ jobs/
│  │     ├─ send-message.ts
│  │     ├─ dispatch-campaign.ts
│  │     └─ ingest-webhook.ts
│  ├─ emails/                       # React Email components
│  │  └─ InviteEmail.tsx
│  ├─ lib/
│  │  ├─ db.ts
│  │  ├─ auth.ts
│  │  ├─ i18n.ts
│  │  ├─ rate-limit.ts
│  │  ├─ hash.ts
│  │  ├─ tokens.ts
│  │  └─ logger.ts
│  ├─ ui/                           # design-system primitives
│  │  ├─ Button.tsx
│  │  ├─ SideSheet.tsx
│  │  ├─ SegmentedNav.tsx
│  │  ├─ DataTable.tsx
│  │  ├─ CommandPalette.tsx
│  │  └─ ...
│  └─ config/
│     └─ tokens.css                 # design tokens as CSS vars
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ messages/
│  ├─ en.json
│  └─ ar.json
├─ tests/
│  ├─ e2e/
│  └─ unit/
├─ scripts/
│  └─ dev-worker.ts                 # local worker entrypoint
├─ worker.ts                        # production worker entrypoint
├─ .env.example
├─ railway.json
├─ package.json
└─ BUILD.md
```

## 4. Environment

`.env.example`:

```
# Core
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rsvp
AUTH_SECRET=change-me-32-bytes-hex
TOKEN_SIGNING_SECRET=change-me-32-bytes-hex
WEBHOOK_SHARED_SECRET=change-me-32-bytes-hex

# Defaults
DEFAULT_LOCALE=en
DEFAULT_TIMEZONE=Asia/Riyadh

# Provider selection
SMS_PROVIDER=mock           # mock | twilio
EMAIL_PROVIDER=mock         # mock | resend

# Twilio (fill later, leave blank for mock)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_WEBHOOK_SIGNING_KEY=

# Resend (fill later, leave blank for mock)
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM_DEFAULT="Events <events@example.com>"

# Mock behavior
MOCK_AUTO_DELIVER=true      # auto-emit delivered events
MOCK_AUTO_OPEN_RATE=0.7
MOCK_AUTO_CLICK_RATE=0.4
```

The provider registry (§8) reads `SMS_PROVIDER` / `EMAIL_PROVIDER` and selects the adapter. Switching to live = change envs, redeploy. No code change.

## 5. Data model (Prisma schema)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role { OWNER EDITOR VIEWER }
enum Channel { SMS EMAIL }
enum EventStatus { DRAFT SCHEDULED LIVE ARCHIVED }
enum RsvpStatus { PENDING ACCEPTED DECLINED }
enum CampaignStatus { DRAFT QUEUED SENDING PAUSED COMPLETED FAILED }
enum MessageStatus {
  DRAFT QUEUED ACCEPTED SENT DELIVERED OPENED CLICKED
  BOUNCED COMPLAINED FAILED
}
enum SuppressionReason { BOUNCE COMPLAINT UNSUBSCRIBE MANUAL INVALID }

model Organization {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  defaultLocale  String   @default("en")
  defaultTimezone String  @default("Asia/Riyadh")
  logoUrl        String?
  brandAccent    String   @default("#009B87")
  supportEmail   String?
  supportPhone   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  users      User[]
  events     Event[]
  guests     Guest[]
  templates  Template[]
  suppressions Suppression[]
  auditLogs  AuditLog[]
}

model User {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  email          String   @unique
  passwordHash   String?
  role           Role     @default(VIEWER)
  locale         String   @default("en")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sessions     Session[]
  auditLogs    AuditLog[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Event {
  id             String      @id @default(cuid())
  organizationId String
  title          String
  slug           String
  description    String?
  venueName      String?
  venueAddress   String?
  mapUrl         String?
  startsAt       DateTime
  endsAt         DateTime?
  timezone       String      @default("Asia/Riyadh")
  rsvpDeadline   DateTime?
  dressCode      String?
  heroImageUrl   String?
  status         EventStatus @default(DRAFT)
  settingsJson   Json        @default("{}")
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitees     Invitee[]
  campaigns    Campaign[]
  outboundMessages OutboundMessage[]

  @@unique([organizationId, slug])
  @@index([organizationId, status])
}

model Guest {
  id             String   @id @default(cuid())
  organizationId String
  firstName      String?
  lastName       String?
  fullName       String
  email          String?
  phoneE164      String?
  preferredLocale String?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitees     Invitee[]

  @@index([organizationId])
  @@index([organizationId, email])
  @@index([organizationId, phoneE164])
}

model Invitee {
  id             String     @id @default(cuid())
  eventId        String
  guestId        String
  partySizeLimit Int        @default(1)
  allowPlusOne   Boolean    @default(false)
  tagsJson       Json       @default("[]")
  rsvpStatus     RsvpStatus @default(PENDING)
  respondedAt    DateTime?
  responseSource String?
  tokenHash      String     @unique   // SHA-256 of the signed token body
  tokenVersion   Int        @default(1)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guest Guest @relation(fields: [guestId], references: [id], onDelete: Restrict)
  outboundMessages OutboundMessage[]
  rsvpResponses    RsvpResponse[]

  @@unique([eventId, guestId])
  @@index([eventId, rsvpStatus])
}

model Template {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  channel        Channel
  locale         String
  subject        String?
  preheader      String?
  bodyMarkdown   String?
  smsBody        String?
  isDefault      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  campaigns    Campaign[]

  @@index([organizationId, channel, locale])
}

model Campaign {
  id              String         @id @default(cuid())
  eventId         String
  channel         Channel
  templateId      String
  status          CampaignStatus @default(DRAFT)
  audienceFilterJson Json        @default("{}")
  scheduledAt     DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  createdByUserId String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  event    Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  template Template @relation(fields: [templateId], references: [id], onDelete: Restrict)
  outboundMessages OutboundMessage[]

  @@index([eventId, status])
}

model OutboundMessage {
  id                String        @id @default(cuid())
  campaignId        String
  eventId           String
  inviteeId         String
  channel           Channel
  provider          String
  providerMessageId String?
  senderIdentity    String
  recipientEmail    String?
  recipientPhoneE164 String?
  renderedSubject   String?
  renderedText      String?
  renderedHtml      String?
  trackedLink       String?
  status            MessageStatus @default(DRAFT)
  lastErrorCode     String?
  lastErrorMessage  String?
  acceptedAt        DateTime?
  deliveredAt       DateTime?
  openedAt          DateTime?
  clickedAt         DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  event    Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  invitee  Invitee  @relation(fields: [inviteeId], references: [id], onDelete: Cascade)

  @@unique([provider, providerMessageId])
  @@index([campaignId, status])
  @@index([inviteeId])
}

model RsvpResponse {
  id            String     @id @default(cuid())
  inviteeId     String
  status        RsvpStatus
  attendeeCount Int        @default(1)
  note          String?
  locale        String
  submittedAt   DateTime   @default(now())
  ipHash        String?
  userAgent     String?

  invitee Invitee @relation(fields: [inviteeId], references: [id], onDelete: Cascade)

  @@index([inviteeId, submittedAt])
}

model WebhookReceipt {
  id                String   @id @default(cuid())
  provider          String
  channel           Channel
  signatureVerified Boolean
  dedupeKey         String   @unique
  payloadJson       Json
  receivedAt        DateTime @default(now())
  processedAt       DateTime?
  processingError   String?
}

model Suppression {
  id             String            @id @default(cuid())
  organizationId String
  channel        Channel
  value          String            // email or E.164
  reason         SuppressionReason
  source         String
  createdAt      DateTime          @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, channel, value])
}

model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  actorUserId    String?
  entityType     String
  entityId       String
  action         String
  metadataJson   Json     @default("{}")
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  actor        User?        @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([organizationId, entityType, entityId])
}
```

## 6. Core flows

```
COMPOSE → SCHEDULE/SEND
 admin ──► Campaign(DRAFT) ──► enqueue `dispatch-campaign`
 worker consumes: iterates invitees matching audienceFilter
   for each invitee:
     - check Suppression
     - render template with invitee + event context (locale)
     - mint tracked link (/r/{token}) from invitee.tokenHash version
     - create OutboundMessage(QUEUED)
     - enqueue `send-message`
 `send-message`:
   - load OutboundMessage, select provider by channel
   - call provider.send()
   - mark ACCEPTED with externalMessageId
   - on provider error, mark FAILED with error, retry per policy

WEBHOOK → STATUS
 provider → /api/webhooks/{channel}/{provider}
 route verifies signature → inserts WebhookReceipt with dedupeKey
   (dedupeKey = sha256(provider + externalId + status + occurredAt))
 enqueue `ingest-webhook` with receipt id
 worker updates OutboundMessage status monotonically
   (never downgrade: DELIVERED can become OPENED/CLICKED; BOUNCED is terminal)

PUBLIC RSVP
 guest opens /r/{token}
   - verify HMAC, lookup Invitee by tokenHash, check tokenVersion
   - render invite page in guest.preferredLocale (fallback to event default)
 submit POST /api/rsvp (token in body)
   - idempotent: if already responded, show current state (editable until deadline)
   - write RsvpResponse + update Invitee.rsvpStatus
   - log AuditLog
```

## 7. Token system (`src/lib/tokens.ts`)

Compact, signed, rotatable. No DB lookup needed to verify format before resolving.

```ts
import crypto from "node:crypto";

const SECRET = process.env.TOKEN_SIGNING_SECRET!;
const b64u = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uDecode = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export interface TokenBody { i: string; v: number }   // inviteeId, version

export function mintRsvpToken(body: TokenBody): { token: string; tokenHash: string } {
  const payload = b64u(Buffer.from(JSON.stringify(body)));
  const sig = b64u(
    crypto.createHmac("sha256", SECRET).update(payload).digest()
  ).slice(0, 22); // 128-bit truncation, adequate + compact
  const token = `${payload}.${sig}`;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function verifyRsvpToken(token: string): TokenBody | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64u(
    crypto.createHmac("sha256", SECRET).update(payload).digest()
  ).slice(0, 22);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(b64uDecode(payload).toString()) as TokenBody;
  } catch {
    return null;
  }
}
```

Token lifecycle: mint when the Invitee is created (or when `tokenVersion` is bumped by admin "Rotate link"). The **hash** is stored; raw token never stored. Verification must match both signature and `Invitee.tokenVersion`.

## 8. Provider layer

### 8.1 Contracts (`src/providers/types.ts`)

```ts
export type Channel = "sms" | "email";

export type NormalizedDeliveryStatus =
  | "accepted"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed";

export interface ProviderCapabilities {
  supportsScheduling: boolean;
  supportsDeliveryWebhooks: boolean;
  supportsOpenTracking: boolean;
  supportsClickTracking: boolean;
  supportsInboundReplies: boolean;
  requiresApprovedSenderId: boolean;
}

export interface NormalizedSendResult {
  provider: string;
  externalMessageId: string;
  acceptedAt: string;
  raw?: unknown;
}

export interface NormalizedDeliveryEvent {
  provider: string;
  channel: Channel;
  externalMessageId: string;
  status: NormalizedDeliveryStatus;
  occurredAt: string;
  errorCode?: string;
  errorMessage?: string;
  raw: unknown;
}

export interface SmsSendInput {
  to: string;
  body: string;
  senderId: string;
  clientReference: string;
  webhookUrl: string;
}

export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  clientReference: string;
  webhookUrl: string;
}

export interface SmsProvider {
  name: string;
  capabilities: ProviderCapabilities;
  send(input: SmsSendInput): Promise<NormalizedSendResult>;
  verifyWebhook(req: Request): Promise<boolean>;
  parseWebhook(req: Request): Promise<NormalizedDeliveryEvent[]>;
}

export interface EmailProvider {
  name: string;
  capabilities: ProviderCapabilities;
  send(input: EmailSendInput): Promise<NormalizedSendResult>;
  verifyWebhook(req: Request): Promise<boolean>;
  parseWebhook(req: Request): Promise<NormalizedDeliveryEvent[]>;
}

export interface ProviderRegistry {
  sms(name: string): SmsProvider;
  email(name: string): EmailProvider;
  activeSms(): SmsProvider;
  activeEmail(): EmailProvider;
}
```

### 8.2 Registry (`src/providers/registry.ts`)

```ts
import { mockSms } from "./sms/mock";
import { twilioSms } from "./sms/twilio";
import { mockEmail } from "./email/mock";
import { resendEmail } from "./email/resend";
import type { ProviderRegistry } from "./types";

const smsByName = { mock: mockSms, twilio: twilioSms };
const emailByName = { mock: mockEmail, resend: resendEmail };

export const registry: ProviderRegistry = {
  sms: (n) => smsByName[n as keyof typeof smsByName],
  email: (n) => emailByName[n as keyof typeof emailByName],
  activeSms: () => smsByName[(process.env.SMS_PROVIDER ?? "mock") as "mock"],
  activeEmail: () => emailByName[(process.env.EMAIL_PROVIDER ?? "mock") as "mock"],
};
```

### 8.3 Mock SMS (`src/providers/sms/mock.ts`)

```ts
import { randomUUID } from "node:crypto";
import { enqueueMockDelivery } from "@/queue/jobs/ingest-webhook";
import type { SmsProvider, NormalizedDeliveryEvent } from "../types";

export const mockSms: SmsProvider = {
  name: "mock",
  capabilities: {
    supportsScheduling: true,
    supportsDeliveryWebhooks: true,
    supportsOpenTracking: false,
    supportsClickTracking: true,
    supportsInboundReplies: false,
    requiresApprovedSenderId: true,
  },
  async send(input) {
    const externalMessageId = `mock_sms_${randomUUID()}`;
    console.info("[mockSms] send", {
      to: input.to, senderId: input.senderId, body: input.body, ref: input.clientReference,
    });
    if (process.env.MOCK_AUTO_DELIVER === "true") {
      await enqueueMockDelivery({
        provider: "mock", channel: "sms", externalMessageId,
        sequence: ["accepted", "sent", "delivered"],
      });
    }
    return {
      provider: "mock",
      externalMessageId,
      acceptedAt: new Date().toISOString(),
    };
  },
  async verifyWebhook() { return true; },
  async parseWebhook(req) {
    const body = await req.json();
    return [body as NormalizedDeliveryEvent];
  },
};
```

### 8.4 Mock Email (`src/providers/email/mock.ts`)

Same shape as mockSms. Also writes rendered HTML to `./.mock-outbox/{id}.html` in dev so you can preview delivered emails without a real mailbox. Randomly emits open/click events per `MOCK_AUTO_OPEN_RATE` / `MOCK_AUTO_CLICK_RATE`.

### 8.5 Live adapter stubs

`twilio.ts` and `resend.ts` implement the same interface. They read creds from env; when creds are absent, they throw a clear error message on construction **only if selected via env** — they are not instantiated otherwise. Leave internals as `throw new Error("Not implemented — fill in when credentials provided");` with TODO markers for `send`, `verifyWebhook`, `parseWebhook`.

## 9. Message rendering

- Variables available in templates:
  `{{guest.firstName}}`, `{{guest.fullName}}`, `{{event.title}}`, `{{event.startsAt}}`, `{{event.venueName}}`, `{{rsvp.link}}`, `{{rsvp.deadline}}`, `{{org.supportEmail}}`.
- Render pipeline: locale-select template → Mustache-safe substitution (no HTML injection in SMS; escape in HTML) → React Email renders HTML + text for email → SMS body is rendered directly with length check (warn > 160 chars for GSM-7, > 70 for UCS-2).
- One default template per (channel, locale) must be seeded.

## 10. Send pipeline (pg-boss)

Jobs:
- `dispatch-campaign`: concurrency 2, retry 3, exponential backoff.
- `send-message`: concurrency 8, retry 5, backoff starting 30s. Idempotent via `OutboundMessage.status` guard (only sends when QUEUED).
- `ingest-webhook`: concurrency 4, dedup via `WebhookReceipt.dedupeKey`.

State monotonicity:
```
DRAFT → QUEUED → ACCEPTED → SENT → DELIVERED → (OPENED) → (CLICKED)
                                     ↘ BOUNCED
                                     ↘ COMPLAINED
                          ↘ FAILED
```
An update never moves backwards. Downgrades are ignored.

## 11. Webhook ingestion

`/api/webhooks/{channel}/{provider}`:
1. Raw body read once. Signature verified via the selected provider's `verifyWebhook`.
2. Compute `dedupeKey`. Upsert `WebhookReceipt` (insert-if-not-exists). Return 200 immediately.
3. Enqueue `ingest-webhook` job with the receipt id.
4. Job loads receipt, resolves `OutboundMessage` via `(provider, externalMessageId)`, applies monotonic status update.

Always respond 200 to signed, duplicate, or unknown-but-signed payloads. Never retry the provider's retry on our end.

## 12. API routes

Public (no auth):
- `POST /api/rsvp` `{ token, status, attendeeCount, note, locale }` → `{ ok, status, event }`
- `GET /api/track/open/:messageId` → returns 1x1 transparent GIF, emits internal open event (mock/email only where provider lacks native tracking)
- `GET /api/track/click/:token?u=<destination>` → 302, emits internal click event

Admin (session-required, role-gated):
- `POST /api/events` / `PATCH /api/events/:id`
- `POST /api/events/:id/invitees/import` (multipart CSV)
- `POST /api/events/:id/invitees/:inviteeId/rotate-token`
- `POST /api/templates` / `PATCH /api/templates/:id`
- `POST /api/campaigns` — create
- `POST /api/campaigns/:id/preview` — renders 5 sample messages
- `POST /api/campaigns/:id/dispatch`
- `POST /api/campaigns/:id/pause` / `resume`
- `GET /api/events/:id/metrics` — live counts (server-computed from OutboundMessage + RsvpResponse)

All inputs validated with Zod. All admin mutations write `AuditLog`.

## 13. Admin UX

### 13.1 Shell
- Top bar, 56px tall. Left: workspace name (org.name). Center: none. Right: command (⌘K) + avatar.
- Left rail, 64px collapsed icons / 240px expanded. Items: `Events`, `Templates`, `Settings`. Rail state persists per user.
- Everything else is inside the main area. No tabs in the shell. No breadcrumbs above the workspace.

### 13.2 Events index
- Simple list, not cards. Single table: Title · Date · Status · Responded/Invited · Actions.
- Search at top, single filter chip row (Status).
- Primary CTA top-right: "New event" — the only primary visible.
- Row click opens event workspace.

### 13.3 Event workspace (`/events/:id`)
- Workspace header, compact: hero color bar (brandAccent), event title, date/time in event tz with `Asia/Riyadh (UTC+03)` affordance, RSVP deadline, status pill.
- Below header: a **segmented nav** (not tabs, not pill buttons) — underline style — with `Overview · Guests · Compose · Delivery · Responses`. Selected segment carries the brand accent on a 1px underline; others are neutral. No color swaps.
- Only one content region below. No secondary sidebar. No action strips.

#### Overview
- Four live numbers in a single row, flush left, no boxes: `Invited`, `Accepted`, `Declined`, `Pending`. Numbers are 40/44 weight 500; labels are micro-eyebrow above. A horizontal capacity bar (1px) runs under the row, showing accepted/invited.
- Below: a calm timeline (12–16 items max): "Campaign X sent · 187 delivered", "Mohammed Al-Saud accepted". Times right-aligned.
- Right side of workspace: nothing. Do not put a sidebar here.

#### Guests
- Virtualized table. Columns: Name · Contact (email or phone, combined, icon prefix) · Tags · RSVP · Party · Updated.
- Row click opens a **right-side sheet** with invitee detail (not a modal, not a new page).
- Bulk: selection checkbox activates a bottom bar (slide up, 48px, pinned) with: Send to selection · Tag · Remove. Bar hides when selection clears.
- Import guests: toolbar button opens a **side sheet** with drag-drop CSV, column mapping, preview, and confirm. Never a full-page route.

#### Compose
- Two columns, 1:1 on desktop, stacked on mobile.
- Left: form — channel toggle (SMS | Email), locale toggle (EN | AR), template picker, audience filter (chips), schedule (Now / At time), sender identity.
- Right: **live preview**. For SMS, phone-shaped frame at 320px width; for email, letter-shaped frame with subject + preheader + body. Variables resolved against a randomly chosen invitee from the current audience, with a "Shuffle preview" micro-action.
- Below form: primary CTA "Schedule send" or "Send now". Secondary: "Save draft". No tertiary. No "reset" button.

#### Delivery
- Campaign list, same table language as Events index. Each row shows counts: `sent / delivered / opened / clicked / bounced`. Columns are numbers only, right-aligned, tabular-nums.
- Row opens a side sheet with per-message drilldown and a status timeline.

#### Responses
- Three-column cluster of counts at top (Accepted / Declined / Pending) — same number style as Overview.
- Below: response list with time, guest, status change, note (if any). Filter by status via a single segmented control.

### 13.4 Templates
- Simple list of templates. Filter by channel + locale.
- Edit = full-page route (not a modal) because of the rendered preview panel.

### 13.5 Settings
- `Brand`: logo, brand accent color picker (HSL wheel, values are live-reflected in the app via CSS custom props), default locale, default tz, support contacts.
- `Channels`: which provider is active for SMS / Email. Read-only in mock mode, shows "Mock active" with a switch disabled and helper text explaining how to switch via env.
- `Team`: users + roles. Invite by email sends a magic link.
- `Retention`: dropdown "Delete message bodies after N days" (default 90). Cron job purges `renderedHtml`, `renderedText`, `renderedSubject` after the window. Status and delivery metadata are retained.

### 13.6 Command palette (⌘K)
- cmdk. Items: "Go to event...", "Create event", "Import guests", "New campaign", "Search guests", "Open template".
- No categories shown until the input is empty.

## 14. Public RSVP UX

Critical surface. This is the thing guests see.

### 14.1 Route `/r/{token}`

**Layout (mobile-first):**
```
┌─────────────────────────────┐
│ [brand strip — 3px accent]  │
│                             │
│   small eyebrow             │  ← "YOU'RE INVITED"
│   Event Title (36–44)       │
│                             │
│   Date · Time · TZ          │
│   Venue, Line 2             │
│                             │
│   [ Accept ]   [ Decline ]  │  ← 56px high, equal width row
│                             │
│   Can't make it? · Map · Add to calendar
└─────────────────────────────┘
```

- Full-bleed hero image optional (from `event.heroImageUrl`). If present, it renders behind a 72% neutral veil so text remains calm. No dramatic gradients.
- No header nav. No footer. No logo unless `organization.logoUrl` is set, and then 24px, bottom-left, 60% opacity.
- Personalized greeting line (small, above the title): "Dear {firstName}," (EN) / "عزيزي {firstName}،" (AR). Skip if no first name.
- Accept/Decline are the **only** primary-weight elements. Both same shape; accent lives on focus + press. Accept is left in LTR, right in RTL.

**Accept path:**
1. Tap Accept → the two buttons slide together into a single panel that expands downward (220ms, ease-out).
2. New panel shows (conditionally, based on event settings):
   - Attendee count stepper (1 … partySizeLimit). Always visible if limit > 1.
   - Dietary note field (optional, textarea).
   - Plus-one toggle (if `allowPlusOne`).
3. Single primary "Confirm". Secondary "Back".
4. On confirm → thank-you state.

**Thank-you state:**
- Confirmation line: "You're confirmed." / "تأكيد حضورك."
- Event card collapses to compact summary (date, venue).
- Actions: "Add to calendar" (generates .ics client-side), "Open map" (uses `mapUrl`). Both are tertiary, quiet links.
- "Edit response" remains until `rsvpDeadline`. Tapping it restores the Accept/Decline panel with current values.

**Decline path:**
1. Tap Decline → panel slides down with:
   - Single short note field "Anything you'd like to say?" (optional).
2. Confirm.
3. Thank-you state: "Thank you for letting us know." No pressure. No re-prompt.

**Expired / Past deadline:**
- Header line replaces Accept/Decline: "RSVP closed." Current response (if any) is shown read-only. Map and calendar actions remain.

**Bad / rotated token:**
- Calm page: "This invitation link is no longer valid. Please contact {supportEmail/phone}." No error chrome, no "404".

### 14.2 Motion on the RSVP page
- Page reveal: content opacity 0 → 1 over 220ms with an 8px translateY on the title only. No stagger cascade.
- Button press: scale 0.98 over 80ms then back. No shadow change.
- Accept → detail panel: height auto-animate (measured via `ResizeObserver` or `grid-template-rows: 0fr→1fr` technique) at 220ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`.
- Confirm → thank-you: cross-fade (180ms) + 4px slide. Previous block unmounts cleanly.
- Respect `prefers-reduced-motion: reduce` — cut to 0ms durations, keep opacity fades only.

### 14.3 RTL behavior
- When `locale === 'ar'`: `<html dir="rtl" lang="ar">`. Use Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`). Numbers and dates render with `Intl.DateTimeFormat('ar-SA', { calendar: 'gregory', numberingSystem: 'latn' })` — keep numerals Latin for clarity unless the org explicitly opts into Arabic numerals.
- Button order mirrors. Icons that imply direction (arrows) flip via `rtl:-scale-x-100`. Calendar and brand strips do not flip.

## 15. Design tokens

Exposed as CSS variables (`src/config/tokens.css`). Org's `brandAccent` is injected server-side into `--accent` on `<html>` at request time.

```css
:root {
  --bg:            #FBFAF7;
  --surface:       #FFFFFF;
  --surface-alt:   #F4F2ED;
  --text:          #0F0F10;
  --text-muted:    #5C5C60;
  --text-subtle:   #8A8A8F;
  --border:        #EAE8E3;
  --border-strong: #D9D5CC;
  --accent:        #009B87;           /* Ministry of Media teal; overridden per org */
  --accent-ink:    #FFFFFF;           /* text over accent */
  --accent-strong: #00705E;           /* darker accent for small text where WCAG AA on white is tight */
  --danger:        #B3261E;
  --success:       #1F6B3A;

  --radius-sm:     4px;
  --radius-md:     8px;
  --radius-lg:     12px;

  --shadow-sm:     0 1px 2px rgba(15,15,16,0.04);
  --shadow-md:     0 4px 16px -4px rgba(15,15,16,0.08);
  --shadow-lg:     0 12px 40px -8px rgba(15,15,16,0.12);

  --ease-std:      cubic-bezier(0.22, 1, 0.36, 1);
  --ease-emph:     cubic-bezier(0.2, 0.8, 0.2, 1);
  --dur-xs:        120ms;
  --dur-sm:        180ms;
  --dur-md:        220ms;
  --dur-lg:        320ms;

  --font-latin:    "Inter", system-ui, sans-serif;
  --font-arabic:   "IBM Plex Sans Arabic", "Noto Sans Arabic", system-ui, sans-serif;
}

html[lang="ar"] { font-family: var(--font-arabic); }
html[lang="en"] { font-family: var(--font-latin); }
```

Typography scale (Tailwind config extension):
```
display   56 / 60  weight 500  tracking -0.02em
h1        40 / 44  weight 500  tracking -0.015em
h2        28 / 32  weight 500  tracking -0.01em
h3        20 / 24  weight 500  tracking -0.005em
body-lg   17 / 26  weight 400
body      15 / 24  weight 400
small     13 / 20  weight 400
micro     11 / 16  weight 500  tracking 0.06em  UPPERCASE
```

Spacing scale: `0 · 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Do not use values outside this set.

### Component rules (agent must follow)
- **No shadows on static surfaces.** Shadows only on overlays (drawers, sheets, palettes, tooltips).
- **Borders are 1px, color `--border`.** No 2px borders.
- **Radius ≤ 12px.** `--radius-lg` only on the outer frame of overlays.
- **Only one primary button visible per screen.** Secondary = outlined or ghost; tertiary = text link.
- **No colored status pills.** Status uses a 6px circle dot + text color shift.
- **Tables use row hover only**, no zebra stripes, no card wrapping.
- **Inputs:** 44px tall mobile, 40px desktop. 1px border, `--border-strong` on focus. No focus rings with color shadows; use `outline: 2px solid var(--accent); outline-offset: 2px` only.

## 16. Localization

- `messages/en.json` and `messages/ar.json`. Keys are namespaced: `admin.events.list.title`, `public.rsvp.accept`, etc.
- Every user-visible string must route through next-intl. No literal strings in JSX except brand-owned proper nouns.
- Locale resolution order on public pages: token→invitee.preferredLocale → guest.preferredLocale → org.defaultLocale → URL `?lang=` → Accept-Language.
- Provide a language toggle on the RSVP page, bottom-right, small. Sets a 30-day cookie.

## 17. Security

- **Rate limit** `/api/rsvp` and `/api/webhooks/*` per IP: 60/min sustained, 10/sec burst. Use token-bucket in Postgres (`rate_limit_buckets` table) — no external dep.
- **IP hashing**: `sha256(ip + TOKEN_SIGNING_SECRET)` before storing on `RsvpResponse`.
- **Webhook verification**: each adapter implements `verifyWebhook`. For mock, require header `x-mock-secret === WEBHOOK_SHARED_SECRET` so local testing exercises the path.
- **CSP**: strict, nonce-based on all HTML routes. No inline scripts without nonce.
- **CSRF**: Auth.js handles admin; public RSVP uses token as the authentication credential (no session cookie needed). Do not accept GET for RSVP submission.
- **Password hashing**: bcrypt, cost 12.
- **Domain authentication prep**: README includes SPF/DKIM/DMARC setup steps for the eventual email domain; not blocking in mock.
- **No PII in logs**. Log structure: `event_id`, `invitee_id`, `status`, `provider`. Never the phone number or email in log lines.
- **Retention**: cron (daily 03:00 Asia/Riyadh) purges rendered bodies older than `org.settingsJson.retentionDays` (default 90). Audit record remains.

## 18. Accessibility

- Every interactive element has a visible focus state and an accessible name.
- Contrast: minimum WCAG AA for all text; primary actions meet AAA at 14px+.
- Keyboard path: full keyboard navigation through the RSVP flow including stepper (Arrow keys) and accept/decline (Enter).
- Screen readers: dynamic status changes on the RSVP page announce via `aria-live="polite"` region.
- RTL is a first-class mode; test both directions in Playwright.

## 19. Testing

Playwright scenarios (minimum):
1. **Full loop, mock**: seed org + event + 3 invitees → admin composes → sends → `MOCK_AUTO_DELIVER` triggers webhooks → statuses propagate → open `/r/{token}` → accept → response recorded → Overview counts update.
2. **RTL render**: same flow in `ar`, assert `dir="rtl"` and button order.
3. **Token tamper**: mutate signature → 410 page.
4. **Expired deadline**: set `rsvpDeadline` in past → RSVP page read-only.
5. **Duplicate webhook**: POST same payload twice → only one status transition.
6. **Monotonic status**: deliver → bounce webhook after → bounce is ignored as a downgrade; only ACCEPTED/SENT transitions to BOUNCED.
7. **CSV import**: 200-row CSV → preview → confirm → 200 Invitees created with dedup by (org, email) / (org, phone).
8. **Rate limit**: 70 requests/min to `/api/rsvp` → last 10 return 429.

Unit (Vitest):
- Token mint/verify.
- Template variable substitution (including missing var handling).
- Phone normalization to E.164.
- Suppression enforcement.
- Monotonic status machine.

## 20. Seed data (`prisma/seed.ts`)

Creates:
- 1 Organization: name `Ministry of Media`, slug `ministry-of-media`, `defaultLocale = "ar"`, `defaultTimezone = "Asia/Riyadh"`, `brandAccent = "#009B87"`, `logoUrl = "/brand/ministry-of-media.png"`, `supportEmail = "events@mom.example.sa"`.
- 3 Users: `owner@example.com` (Owner), `editor@example.com` (Editor), `viewer@example.com` (Viewer). Password for all: `demo-password`. Locale `ar`.
- 4 Templates: SMS-EN, SMS-AR, Email-EN, Email-AR, all marked `isDefault` within their (channel, locale). Arabic copy is primary; English is secondary.
- 1 Event: title `حفل وزارة الإعلام السنوي` (EN: `Ministry of Media Annual Reception`), slug `annual-reception-2026`, `startsAt` = `2026-05-15T20:00:00+03:00`, venue `The Ritz-Carlton, Riyadh`, `heroImageUrl` placeholder, `timezone = "Asia/Riyadh"`.
- 40 Guests, 40 Invitees on the event, mixed `preferredLocale` (majority `ar`), distributed E.164 Saudi numbers (+9665...).
- 1 Campaign in DRAFT (so "Send now" is visible).

Seed uses `npx prisma db seed` via package.json.

## 21. Deployment (Railway)

`railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Two services inside one Railway project:
- **web** — `npm run build && next start -p $PORT`
- **worker** — `node worker.js` (runs `pg-boss` consumer loop, restarts on crash)

Add **PostgreSQL plugin** service; Railway injects `DATABASE_URL` into both.

Add cron (Railway scheduled cron): daily 00:00 UTC → `node scripts/retention.js` (which is also just a queued job, but the trigger lives here).

## 22. Task order for the agent

Execute top-to-bottom. Do not jump ahead.

1. Scaffold Next.js 15 + TS + Tailwind. Configure strict TS, path alias `@/*`.
2. Install all deps from §2.
3. Commit `BUILD.md`, `.env.example`, token CSS, Tailwind config, `globals.css`.
4. Write `prisma/schema.prisma` (§5). Run `prisma migrate dev --name init`. Write `seed.ts` (§20). Run seed.
5. Implement `src/lib/db.ts`, `tokens.ts`, `hash.ts`, `logger.ts`, `rate-limit.ts`.
6. Implement provider types + registry + mock SMS + mock email + Twilio/Resend stubs (§8).
7. Implement pg-boss setup (`src/queue/boss.ts`) and jobs (§10).
8. Implement `worker.ts` entrypoint.
9. Implement API routes: `rsvp`, `track/open`, `track/click`, both webhook routes (§12).
10. Implement Auth.js with credentials + magic link (§1).
11. Build UI primitives (`src/ui/*`) per design rules (§15).
12. Build admin shell + Events index + event workspace segmented nav (§13).
13. Build Overview, Guests (table + side sheet), Compose (form + live preview), Delivery, Responses.
14. Build Templates list + editor; Settings (Brand, Channels, Team, Retention).
15. Build public RSVP route `/r/[token]` with full motion spec (§14).
16. Wire next-intl and translate every string. Ensure RTL passes visually in Arabic.
17. Add AuditLog writes on every admin mutation.
18. Implement suppression enforcement at dispatch time.
19. Write Playwright tests (§19). All 8 scenarios must pass.
20. Write Vitest unit tests.
21. Configure `railway.json`, add health check route `/api/health` (returns DB + queue status).
22. Verify the full mock loop locally: `npm run dev` and `npm run worker` in parallel, run seed, log in as owner, open event, compose, send, watch Delivery populate, open token link, accept, see Overview update.
23. Ship.

## 23. Switching to live providers (later, no code change)

1. Configure sending domain; set SPF, DKIM, DMARC DNS records.
2. Buy/approve SMS sender ID with Twilio (or replace `twilio.ts` with a Unifonic adapter if the client prefers a local provider — contract is identical).
3. Set `SMS_PROVIDER=twilio`, `EMAIL_PROVIDER=resend`, fill credentials in Railway env.
4. Point provider webhook URLs to `{APP_URL}/api/webhooks/sms/twilio` and `.../email/resend`.
5. Redeploy.

The rest of the app is unchanged.

## 24. Client brand: Ministry of Media (KSA)

This app is being built for the **Saudi Ministry of Media** (وزارة الإعلام). Brand decisions are locked as follows. Seed data and `--accent` default reflect these.

- **Organization name (EN):** Ministry of Media
- **Organization name (AR):** وزارة الإعلام
- **Primary accent:** `#009B87` — teal taken from the ministry identity.
  - If the ministry's official brand guide specifies a different hex, override `Organization.brandAccent` (per-org) and the `--accent` fallback in `src/config/tokens.css`.
- **Accent ink (text over accent):** `#FFFFFF` for 16px+ / 14px+ bold. For smaller text on accent or fine rules, use `--accent-strong` (`#00705E`) instead.
- **Logo:** place the file at `public/brand/ministry-of-media.png`. Reference it from `Organization.logoUrl = "/brand/ministry-of-media.png"`. Logo renders at 24px height, bottom-left of the public RSVP page, `opacity: 0.9` (raise from the generic 60% for an official mark). In the admin top bar, render the org name, not the logo — the logo is reserved for public-facing surfaces and printed collateral.
- **Default locale:** `ar` (Arabic-first). English is available via the locale toggle but Arabic is the primary surface.
- **Default timezone:** `Asia/Riyadh`.
- **Typography:**
  - Arabic: **IBM Plex Sans Arabic** at 500/400 weights. Keep tracking default.
  - Latin (English): **Inter** at 500/400. If the ministry brand guide specifies **Neue Haas Grotesk** / **29LT Bukra**, swap only the two `--font-latin` / `--font-arabic` tokens.
- **Tone:** formal, restrained, respectful. Default invite opening (AR): `السلام عليكم ورحمة الله،` followed by personal salutation if `firstName` exists. English opening: `Dear {firstName},`. Do not use casual language, emoji, or informal interjections in any default template.
- **Email from name:** `Ministry of Media` / `وزارة الإعلام`. Reply-to = `events@mom.example.sa` until the real domain is provisioned.
- **SMS sender ID:** request approval for `MOM` (EN campaigns) and for Arabic sender where the provider supports it. In mock mode, sender ID reads `MOM`.
- **Color contrast discipline:** the teal does not carry status. Never color-code status (Accepted / Declined / Pending) using the accent — status stays with the monochrome dot + text-color shift rule from §15.
- **Privacy posture:** ministry context → treat all guest contact data as sensitive. Retention default drops to **30 days** for rendered message bodies (override of the generic 90 in §17). Audit logs retain indefinitely.

---

## Final notes for the agent

- When in doubt about visual density, remove an element. A second primary button, a card border, a divider — all candidates for removal.
- Never introduce dashboards, charts, or analytics widgets beyond the four-number rows specified.
- Every admin page must work at 1280px; every public page must work at 375px.
- If the Saudi client later requests a specific font pairing (common: **Neue Haas Grotesk** for Latin, **29LT Bukra** for Arabic), change the two tokens in §15 and nothing else.
- The product should feel like one continuous surface the user slides across — not a set of screens stitched together.
