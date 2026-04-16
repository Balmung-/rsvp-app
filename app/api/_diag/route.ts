import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Boot diagnostics. Exposes *presence* of required env (never values),
 * DB reachability, schema state, and seed state. Safe to hit in production
 * for a quick triage; no secrets are returned. Remove or auth-gate later
 * if you prefer.
 */
export async function GET(): Promise<NextResponse> {
  const env = {
    NODE_ENV: process.env.NODE_ENV ?? null,
    APP_URL: present(process.env.APP_URL),
    AUTH_SECRET: present(process.env.AUTH_SECRET),
    AUTH_URL: present(process.env.AUTH_URL),
    TOKEN_SIGNING_SECRET: present(process.env.TOKEN_SIGNING_SECRET),
    WEBHOOK_SHARED_SECRET: present(process.env.WEBHOOK_SHARED_SECRET),
    DATABASE_URL: present(process.env.DATABASE_URL),
    SMS_PROVIDER: process.env.SMS_PROVIDER ?? "mock",
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "mock",
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE ?? null,
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE ?? null,
  };

  const db: {
    reachable: boolean;
    error?: string;
    tables?: { organizations: number; users: number; events: number; invitees: number; templates: number };
    seedLooksApplied?: boolean;
  } = { reachable: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    db.reachable = true;
    const [orgs, users, events, invitees, templates] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.event.count(),
      prisma.invitee.count(),
      prisma.template.count(),
    ]);
    db.tables = { organizations: orgs, users, events, invitees, templates };
    db.seedLooksApplied = orgs > 0 && users > 0;
  } catch (err) {
    db.error = err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
  }

  const ready =
    env.AUTH_SECRET &&
    env.TOKEN_SIGNING_SECRET &&
    env.WEBHOOK_SHARED_SECRET &&
    env.DATABASE_URL &&
    db.reachable &&
    db.seedLooksApplied === true;

  return NextResponse.json(
    {
      ready,
      env,
      db,
      hints: hints(env, db),
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

function present(v: string | undefined): { set: boolean; length: number } {
  return { set: typeof v === "string" && v.length > 0, length: typeof v === "string" ? v.length : 0 };
}

function hints(env: Record<string, unknown>, db: Record<string, unknown>): string[] {
  const out: string[] = [];
  const e = env as Record<string, { set?: boolean }>;
  if (!e.DATABASE_URL?.set) out.push("DATABASE_URL is not set. Attach a PostgreSQL plugin and reference it via ${{Postgres.DATABASE_URL}}.");
  if (!e.AUTH_SECRET?.set) out.push("AUTH_SECRET is not set. NextAuth will throw Configuration errors on every sign-in.");
  if (!e.TOKEN_SIGNING_SECRET?.set) out.push("TOKEN_SIGNING_SECRET is not set. RSVP tokens cannot be minted or verified.");
  if (!e.WEBHOOK_SHARED_SECRET?.set) out.push("WEBHOOK_SHARED_SECRET is not set. Mock provider webhooks will be rejected.");
  if (env.NODE_ENV && env.NODE_ENV !== "production") out.push(`NODE_ENV is set to "${env.NODE_ENV}". Do not set NODE_ENV on the host — next build/start set it automatically.`);
  if (!db.reachable) out.push("Database is not reachable. Check DATABASE_URL points to a running Postgres.");
  if (db.reachable && db.seedLooksApplied === false) out.push("Database is empty. Run: `DATABASE_URL=<railway-public-url> npm run seed` from your laptop to populate demo data.");
  return out;
}
