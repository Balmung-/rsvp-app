import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";
import { getBoss, QUEUES } from "@/queue/boss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, event: { organizationId: user.organizationId } },
  });
  if (!campaign) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (campaign.status !== "DRAFT") {
    return NextResponse.json({ ok: false, error: "NOT_DRAFT" }, { status: 409 });
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "QUEUED" },
  });

  const boss = await getBoss();
  const now = Date.now();
  const scheduledMs = campaign.scheduledAt ? campaign.scheduledAt.getTime() : now;
  const startAfterSeconds = Math.max(0, Math.ceil((scheduledMs - now) / 1000));

  await boss.send(QUEUES.dispatchCampaign, { campaignId: id }, { startAfter: startAfterSeconds });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Campaign",
      entityId: id,
      action: startAfterSeconds > 0 ? "campaign.schedule_dispatch" : "campaign.dispatch",
      metadataJson: startAfterSeconds > 0
        ? { scheduledAt: campaign.scheduledAt?.toISOString(), startAfterSeconds }
        : ({} as never),
    },
  });

  return NextResponse.json({ ok: true, scheduled: startAfterSeconds > 0, startAfterSeconds });
}
