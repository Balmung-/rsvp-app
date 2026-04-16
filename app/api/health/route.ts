import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, { ok: boolean; error?: string }> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true };
  } catch (err) {
    checks.db = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
