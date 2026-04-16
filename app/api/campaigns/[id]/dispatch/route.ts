import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getBoss, QUEUES } from "@/queue/boss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await requireRole(["OWNER", "EDITOR"]);
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
  await boss.send(QUEUES.dispatchCampaign, { campaignId: id });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Campaign",
      entityId: id,
      action: "campaign.dispatch",
    },
  });
  return NextResponse.json({ ok: true });
}
