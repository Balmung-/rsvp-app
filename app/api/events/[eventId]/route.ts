import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(5000).nullable().optional(),
  venueName: z.string().max(200).nullable().optional(),
  venueAddress: z.string().max(500).nullable().optional(),
  mapUrl: z.string().url().max(1000).nullable().optional().or(z.literal("").transform(() => null)),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  timezone: z.string().optional(),
  rsvpDeadline: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  dressCode: z.string().max(200).nullable().optional(),
  heroImageUrl: z.string().url().max(1000).nullable().optional().or(z.literal("").transform(() => null)),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let parsed;
  try { parsed = PatchSchema.parse(await req.json()); }
  catch (err) {
    return NextResponse.json({ ok: false, error: "BAD_INPUT", detail: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.slug !== undefined) data.slug = parsed.slug;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.venueName !== undefined) data.venueName = parsed.venueName;
  if (parsed.venueAddress !== undefined) data.venueAddress = parsed.venueAddress;
  if (parsed.mapUrl !== undefined) data.mapUrl = parsed.mapUrl;
  if (parsed.startsAt !== undefined) data.startsAt = new Date(parsed.startsAt);
  if (parsed.endsAt !== undefined) data.endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
  if (parsed.timezone !== undefined) data.timezone = parsed.timezone;
  if (parsed.rsvpDeadline !== undefined) data.rsvpDeadline = parsed.rsvpDeadline ? new Date(parsed.rsvpDeadline) : null;
  if (parsed.dressCode !== undefined) data.dressCode = parsed.dressCode;
  if (parsed.heroImageUrl !== undefined) data.heroImageUrl = parsed.heroImageUrl;
  if (parsed.status !== undefined) data.status = parsed.status;

  await prisma.event.update({ where: { id: eventId }, data });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Event",
      entityId: eventId,
      action: "event.update",
      metadataJson: parsed as never,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.event.delete({ where: { id: eventId } });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Event",
      entityId: eventId,
      action: "event.delete",
      metadataJson: { title: event.title } as never,
    },
  });

  return NextResponse.json({ ok: true });
}
