import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  eventId: z.string().min(1),
  channel: z.enum(["SMS", "EMAIL"]),
  templateId: z.string().min(1),
  audienceFilter: z.object({
    rsvpStatus: z.array(z.enum(["PENDING", "ACCEPTED", "DECLINED"])).optional(),
    tags: z.array(z.string()).optional(),
    inviteeIds: z.array(z.string()).optional(),
  }).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const user = await requireRole(["OWNER", "EDITOR"]);
  const parsed = Schema.parse(await req.json());

  const event = await prisma.event.findFirst({
    where: { id: parsed.eventId, organizationId: user.organizationId },
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const template = await prisma.template.findFirst({
    where: { id: parsed.templateId, organizationId: user.organizationId },
  });
  if (!template) return NextResponse.json({ ok: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });

  const campaign = await prisma.campaign.create({
    data: {
      eventId: event.id,
      channel: parsed.channel,
      templateId: template.id,
      status: "DRAFT",
      audienceFilterJson: (parsed.audienceFilter ?? {}) as never,
      scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
      createdByUserId: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Campaign",
      entityId: campaign.id,
      action: "campaign.create",
    },
  });

  return NextResponse.json({ ok: true, id: campaign.id });
}
