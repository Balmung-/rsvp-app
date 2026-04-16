import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const [total, accepted, declined, pending, msg] = await Promise.all([
    prisma.invitee.count({ where: { eventId } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "ACCEPTED" } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "DECLINED" } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "PENDING" } }),
    prisma.outboundMessage.groupBy({
      where: { eventId },
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const delivery = msg.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    invited: total,
    accepted,
    declined,
    pending,
    delivery,
  });
}
