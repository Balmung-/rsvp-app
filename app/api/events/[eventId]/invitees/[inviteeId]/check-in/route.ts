import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  count: z.number().int().min(1).max(50).optional(),
  undo: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string; inviteeId: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { eventId, inviteeId } = await params;

  const invitee = await prisma.invitee.findFirst({
    where: { id: inviteeId, eventId, event: { organizationId: user.organizationId } },
  });
  if (!invitee) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let parsed;
  try { parsed = Body.parse(await req.json().catch(() => ({}))); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  if (parsed.undo) {
    const updated = await prisma.invitee.update({
      where: { id: inviteeId },
      data: { checkedInAt: null, checkedInCount: 0 },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        entityType: "Invitee",
        entityId: inviteeId,
        action: "invitee.check_in_undo",
      },
    });
    return NextResponse.json({ ok: true, checkedInAt: updated.checkedInAt, checkedInCount: updated.checkedInCount });
  }

  const count = parsed.count ?? 1;
  const updated = await prisma.invitee.update({
    where: { id: inviteeId },
    data: {
      checkedInAt: invitee.checkedInAt ?? new Date(),
      checkedInCount: count,
    },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Invitee",
      entityId: inviteeId,
      action: "invitee.check_in",
      metadataJson: { count } as never,
    },
  });
  return NextResponse.json({ ok: true, checkedInAt: updated.checkedInAt, checkedInCount: updated.checkedInCount });
}
