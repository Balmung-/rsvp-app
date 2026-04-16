import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { verifyRsvpToken, tokenHashFromToken } from "@/lib/tokens";
import { hashIp } from "@/lib/hash";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string().min(10).max(512),
  status: z.enum(["ACCEPTED", "DECLINED"]),
  attendeeCount: z.number().int().min(1).max(20).optional(),
  note: z.string().max(600).optional(),
  locale: z.enum(["en", "ar"]).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const ip = ipFromRequest(req);
  const rl = await rateLimit({
    key: `rsvp:ip:${ip}`,
    capacity: 60,
    refillPerSecond: 1,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 });
  }

  const body = verifyRsvpToken(parsed.token);
  if (!body) {
    return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 410 });
  }

  const tokenHash = tokenHashFromToken(parsed.token);
  const invitee = await prisma.invitee.findFirst({
    where: { id: body.i, tokenHash, tokenVersion: body.v },
    include: { event: { include: { organization: true } }, guest: true },
  });
  if (!invitee) {
    return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 410 });
  }

  const now = new Date();
  if (invitee.event.rsvpDeadline && invitee.event.rsvpDeadline.getTime() < now.getTime()) {
    return NextResponse.json({ ok: false, error: "DEADLINE_PASSED" }, { status: 409 });
  }

  const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const ipHash = hashIp(ip);
  const locale = parsed.locale ?? (invitee.guest.preferredLocale === "en" ? "en" : "ar");

  const [, updated] = await prisma.$transaction([
    prisma.rsvpResponse.create({
      data: {
        inviteeId: invitee.id,
        status: parsed.status,
        attendeeCount: parsed.attendeeCount ?? 1,
        note: parsed.note ?? null,
        locale,
        ipHash,
        userAgent: ua,
      },
    }),
    prisma.invitee.update({
      where: { id: invitee.id },
      data: {
        rsvpStatus: parsed.status,
        respondedAt: now,
        responseSource: "web",
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: invitee.event.organizationId,
        actorUserId: null,
        entityType: "Invitee",
        entityId: invitee.id,
        action: "rsvp.submit",
        metadataJson: { status: parsed.status, attendeeCount: parsed.attendeeCount ?? 1 },
      },
    }),
  ]);

  log.info("rsvp.submitted", { inviteeId: invitee.id, status: parsed.status });

  return NextResponse.json({
    ok: true,
    status: updated.rsvpStatus,
    event: {
      title: invitee.event.title,
      startsAt: invitee.event.startsAt.toISOString(),
      venueName: invitee.event.venueName,
      mapUrl: invitee.event.mapUrl,
    },
  });
}
