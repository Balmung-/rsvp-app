# RSVP App

A production-grade foundation for a premium invite + RSVP app. Bilingual (English + Arabic), event-centric administration, tokenized public RSVP, and mock-first providers.

## Getting started

Hand [BUILD.md](./BUILD.md) to an AI coding agent. It contains the complete, ordered specification needed to build the app end-to-end in one pass.

The build sheet is exhaustive on purpose — data model, provider contracts, UX, motion, security, tests, and deploy steps are all force-bearing. Nothing is optional.

## Stack

Next.js 15 · TypeScript · Tailwind · Radix · Prisma · PostgreSQL · pg-boss · React Email · next-intl · Playwright

## Mock mode

The app runs end-to-end with zero external credentials: compose → send (mock) → delivery webhooks (mock) → open/click (mock) → RSVP → tracked response. Swap to live providers (Twilio, Resend) by changing env vars — no code change.

## Deploy target

Railway. One project, three services: `web`, `worker`, `postgres`. Vercel is ruled out because pg-boss requires a persistent worker process.
