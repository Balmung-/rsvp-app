import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness endpoint. Returns 200 as long as the process can respond. DB is
 * probed with a short timeout and reported separately — a DB hiccup must not
 * fail Railway's deploy healthcheck or mark the service unhealthy.
 *
 * Use /api/ready for readiness (not wired to Railway healthcheck).
 */
export async function GET(): Promise<NextResponse> {
  const db = await probeDb();
  return NextResponse.json(
    { ok: true, db },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

async function probeDb(): Promise<{ ok: boolean; error?: string }> {
  const timeout = new Promise<{ ok: false; error: string }>((resolve) =>
    setTimeout(() => resolve({ ok: false, error: "timeout" }), 1500)
  );
  const query = prisma.$queryRaw`SELECT 1`
    .then(() => ({ ok: true as const }))
    .catch((err: unknown) => ({
      ok: false as const,
      error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    }));
  return Promise.race([query, timeout]);
}
