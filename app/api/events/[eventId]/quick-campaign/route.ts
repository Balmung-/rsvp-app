import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";
import { getBoss, QUEUES } from "@/queue/boss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  channel: z.enum(["SMS", "EMAIL"]),
  locale: z.enum(["ar", "en"]).optional(),
  rsvpStatus: z.array(z.enum(["PENDING", "ACCEPTED", "DECLINED"])).min(1).default(["PENDING"]),
});

/**
 * One-shot campaign: pick the default template for (channel, locale) and
 * dispatch immediately to everyone matching the status filter. Used by
 * "Resend to pending" and similar quick actions.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
    include: { organization: true },
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let parsed;
  try { parsed = Body.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  const locale = parsed.locale ?? (event.organization.defaultLocale === "en" ? "en" : "ar");
  const template = await prisma.template.findFirst({
    where: {
      organizationId: user.organizationId,
      channel: parsed.channel,
      locale,
      isDefault: true,
    },
  });
  if (!template) return NextResponse.json({ ok: false, error: "NO_DEFAULT_TEMPLATE" }, { status: 409 });

  const campaign = await prisma.campaign.create({
    data: {
      eventId: event.id,
      channel: parsed.channel,
      templateId: template.id,
      status: "QUEUED",
      audienceFilterJson: { rsvpStatus: parsed.rsvpStatus } as never,
      createdByUserId: user.id,
    },
  });

  const boss = await getBoss();
  await boss.send(QUEUES.dispatchCampaign, { campaignId: campaign.id });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Campaign",
      entityId: campaign.id,
      action: "campaign.quick_dispatch",
      metadataJson: { channel: parsed.channel, locale, rsvpStatus: parsed.rsvpStatus } as never,
    },
  });

  return NextResponse.json({ ok: true, id: campaign.id });
}
