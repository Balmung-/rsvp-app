import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireRoleApi, requireUserApi } from "@/lib/auth";
import { mintRsvpToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string; inviteeId: string }> }
): Promise<NextResponse> {
  const gate = await requireUserApi();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { eventId, inviteeId } = await params;

  const invitee = await prisma.invitee.findFirst({
    where: { id: inviteeId, eventId, event: { organizationId: user.organizationId } },
    include: {
      guest: true,
      rsvpResponses: { orderBy: { submittedAt: "desc" } },
      outboundMessages: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, channel: true, status: true, provider: true, senderIdentity: true,
          recipientEmail: true, recipientPhoneE164: true, renderedSubject: true,
          createdAt: true, acceptedAt: true, deliveredAt: true, openedAt: true, clickedAt: true,
          lastErrorMessage: true,
        },
      },
    },
  });
  if (!invitee) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const { token } = mintRsvpToken({ i: invitee.id, v: invitee.tokenVersion });
  const rsvpUrl = `${process.env.APP_URL ?? ""}/r/${token}`;
  const qrDataUrl = await QRCode.toDataURL(rsvpUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#0F0F10", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });

  return NextResponse.json({
    ok: true,
    invitee: {
      id: invitee.id,
      partySizeLimit: invitee.partySizeLimit,
      allowPlusOne: invitee.allowPlusOne,
      rsvpStatus: invitee.rsvpStatus,
      respondedAt: invitee.respondedAt,
      tokenVersion: invitee.tokenVersion,
      tagsJson: invitee.tagsJson,
      checkedInAt: invitee.checkedInAt,
      checkedInCount: invitee.checkedInCount,
      guest: invitee.guest,
      rsvpUrl,
      qrDataUrl,
      responses: invitee.rsvpResponses,
      messages: invitee.outboundMessages,
    },
  });
}

export async function DELETE(
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

  await prisma.invitee.delete({ where: { id: inviteeId } });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Invitee",
      entityId: inviteeId,
      action: "invitee.delete",
    },
  });

  return NextResponse.json({ ok: true });
}
