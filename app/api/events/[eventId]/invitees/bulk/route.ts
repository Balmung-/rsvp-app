import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";
import { getBoss, QUEUES } from "@/queue/boss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("tag"),
    inviteeIds: z.array(z.string()).min(1).max(2000),
    tag: z.string().min(1).max(60),
  }),
  z.object({
    action: z.literal("untag"),
    inviteeIds: z.array(z.string()).min(1).max(2000),
    tag: z.string().min(1).max(60),
  }),
  z.object({
    action: z.literal("remove"),
    inviteeIds: z.array(z.string()).min(1).max(2000),
  }),
  z.object({
    action: z.literal("send"),
    inviteeIds: z.array(z.string()).min(1).max(2000),
    channel: z.enum(["SMS", "EMAIL"]),
    locale: z.enum(["en", "ar"]).optional(),
    templateId: z.string().optional(),
  }),
]);

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

  // Confine to invitees within this event.
  const owned = await prisma.invitee.findMany({
    where: { id: { in: parsed.inviteeIds }, eventId },
    select: { id: true, tagsJson: true },
  });
  const ownedIds = owned.map((i) => i.id);
  if (ownedIds.length === 0) return NextResponse.json({ ok: false, error: "NONE_MATCHED" }, { status: 404 });

  if (parsed.action === "tag" || parsed.action === "untag") {
    const tag = parsed.tag.trim();
    let changed = 0;
    for (const inv of owned) {
      const cur = Array.isArray(inv.tagsJson) ? (inv.tagsJson as unknown[]).map(String) : [];
      let next: string[];
      if (parsed.action === "tag") {
        if (cur.includes(tag)) continue;
        next = [...cur, tag];
      } else {
        if (!cur.includes(tag)) continue;
        next = cur.filter((t) => t !== tag);
      }
      await prisma.invitee.update({ where: { id: inv.id }, data: { tagsJson: next as never } });
      changed++;
    }
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId, actorUserId: user.id,
        entityType: "Event", entityId: eventId,
        action: `invitee.bulk_${parsed.action}`,
        metadataJson: { tag, count: changed } as never,
      },
    });
    return NextResponse.json({ ok: true, changed });
  }

  if (parsed.action === "remove") {
    const result = await prisma.invitee.deleteMany({ where: { id: { in: ownedIds } } });
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId, actorUserId: user.id,
        entityType: "Event", entityId: eventId,
        action: "invitee.bulk_remove",
        metadataJson: { count: result.count } as never,
      },
    });
    return NextResponse.json({ ok: true, removed: result.count });
  }

  // action === "send"
  const locale = parsed.locale ?? (event.organization.defaultLocale === "en" ? "en" : "ar");
  const template = parsed.templateId
    ? await prisma.template.findFirst({ where: { id: parsed.templateId, organizationId: user.organizationId, channel: parsed.channel } })
    : await prisma.template.findFirst({
        where: { organizationId: user.organizationId, channel: parsed.channel, locale, isDefault: true },
      });
  if (!template) return NextResponse.json({ ok: false, error: "NO_TEMPLATE" }, { status: 409 });

  const campaign = await prisma.campaign.create({
    data: {
      eventId: event.id,
      channel: parsed.channel,
      templateId: template.id,
      status: "QUEUED",
      audienceFilterJson: { inviteeIds: ownedIds } as never,
      createdByUserId: user.id,
    },
  });
  const boss = await getBoss();
  await boss.send(QUEUES.dispatchCampaign, { campaignId: campaign.id });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId, actorUserId: user.id,
      entityType: "Campaign", entityId: campaign.id,
      action: "campaign.bulk_send",
      metadataJson: { count: ownedIds.length, channel: parsed.channel } as never,
    },
  });
  return NextResponse.json({ ok: true, campaignId: campaign.id, count: ownedIds.length });
}
