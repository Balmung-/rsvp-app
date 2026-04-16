import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi, requireUserApi } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostSchema = z.object({
  channel: z.enum(["SMS", "EMAIL"]),
  value: z.string().min(3).max(320),
  reason: z.enum(["BOUNCE", "COMPLAINT", "UNSUBSCRIBE", "MANUAL", "INVALID"]).default("MANUAL"),
});

export async function GET(): Promise<NextResponse> {
  const gate = await requireUserApi();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const list = await prisma.suppression.findMany({
    where: { organizationId: gate.user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ ok: true, items: list });
}

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });

  let parsed;
  try { parsed = PostSchema.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  let value = parsed.value.trim();
  if (parsed.channel === "EMAIL") {
    value = value.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }
  } else {
    const norm = normalizePhone(value);
    if (!norm) return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    value = norm;
  }

  const created = await prisma.suppression.upsert({
    where: { organizationId_channel_value: { organizationId: gate.user.organizationId, channel: parsed.channel, value } },
    create: { organizationId: gate.user.organizationId, channel: parsed.channel, value, reason: parsed.reason, source: "manual" },
    update: { reason: parsed.reason, source: "manual" },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: gate.user.organizationId,
      actorUserId: gate.user.id,
      entityType: "Suppression",
      entityId: created.id,
      action: "suppression.add",
      metadataJson: { channel: parsed.channel, value } as never,
    },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
