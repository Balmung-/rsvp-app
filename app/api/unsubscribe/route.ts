import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyRsvpToken, tokenHashFromToken } from "@/lib/tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string().min(10).max(512),
  channel: z.enum(["EMAIL", "SMS"]).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const ip = ipFromRequest(req);
  const rl = await rateLimit({ key: `unsub:ip:${ip}`, capacity: 30, refillPerSecond: 0.5 });
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

  let parsed;
  try { parsed = Body.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  const body = verifyRsvpToken(parsed.token);
  if (!body) return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 410 });

  const tokenHash = tokenHashFromToken(parsed.token);
  const invitee = await prisma.invitee.findFirst({
    where: { id: body.i, tokenHash, tokenVersion: body.v },
    include: { event: { include: { organization: true } }, guest: true },
  });
  if (!invitee) return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 410 });

  const orgId = invitee.event.organizationId;
  const ops: Promise<unknown>[] = [];

  if ((parsed.channel === "EMAIL" || !parsed.channel) && invitee.guest.email) {
    ops.push(
      prisma.suppression.upsert({
        where: { organizationId_channel_value: { organizationId: orgId, channel: "EMAIL", value: invitee.guest.email } },
        create: { organizationId: orgId, channel: "EMAIL", value: invitee.guest.email, reason: "UNSUBSCRIBE", source: "self_link" },
        update: {},
      })
    );
  }
  if ((parsed.channel === "SMS" || !parsed.channel) && invitee.guest.phoneE164) {
    ops.push(
      prisma.suppression.upsert({
        where: { organizationId_channel_value: { organizationId: orgId, channel: "SMS", value: invitee.guest.phoneE164 } },
        create: { organizationId: orgId, channel: "SMS", value: invitee.guest.phoneE164, reason: "UNSUBSCRIBE", source: "self_link" },
        update: {},
      })
    );
  }

  await Promise.all(ops);
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      actorUserId: null,
      entityType: "Guest",
      entityId: invitee.guestId,
      action: "guest.unsubscribe",
      metadataJson: { channel: parsed.channel ?? "ALL" } as never,
    },
  });

  return NextResponse.json({ ok: true });
}
