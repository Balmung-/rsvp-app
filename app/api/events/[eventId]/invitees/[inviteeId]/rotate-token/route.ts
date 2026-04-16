import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";
import { mintRsvpToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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

  const nextVersion = invitee.tokenVersion + 1;
  const { token, tokenHash } = mintRsvpToken({ i: invitee.id, v: nextVersion });
  await prisma.invitee.update({
    where: { id: invitee.id },
    data: { tokenHash, tokenVersion: nextVersion },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Invitee",
      entityId: invitee.id,
      action: "invitee.rotate_token",
      metadataJson: { version: nextVersion },
    },
  });
  return NextResponse.json({ ok: true, token, tokenVersion: nextVersion });
}
