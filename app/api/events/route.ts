import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  venueName: z.string().max(200).optional(),
  venueAddress: z.string().max(500).optional(),
  mapUrl: z.string().url().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  timezone: z.string().default("Asia/Riyadh"),
  rsvpDeadline: z.string().datetime().optional(),
  dressCode: z.string().max(200).optional(),
  heroImageUrl: z.string().url().max(1000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  let parsed;
  try { parsed = CreateSchema.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  const event = await prisma.event.create({
    data: {
      organizationId: user.organizationId,
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      venueName: parsed.venueName,
      venueAddress: parsed.venueAddress,
      mapUrl: parsed.mapUrl,
      startsAt: new Date(parsed.startsAt),
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      timezone: parsed.timezone,
      rsvpDeadline: parsed.rsvpDeadline ? new Date(parsed.rsvpDeadline) : null,
      dressCode: parsed.dressCode,
      heroImageUrl: parsed.heroImageUrl,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Event",
      entityId: event.id,
      action: "event.create",
    },
  });

  return NextResponse.json({ ok: true, id: event.id });
}
