import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness endpoint. 200 when the DB is reachable. Use this for external
 * probes that need to know whether the app can serve real traffic. Separate
 * from /api/health so a DB incident does not restart the container.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200) },
      { status: 503 }
    );
  }
}
