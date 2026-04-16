import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const { id } = await params;
  const sup = await prisma.suppression.findFirst({
    where: { id, organizationId: gate.user.organizationId },
  });
  if (!sup) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  await prisma.suppression.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      organizationId: gate.user.organizationId,
      actorUserId: gate.user.id,
      entityType: "Suppression",
      entityId: id,
      action: "suppression.remove",
      metadataJson: { channel: sup.channel, value: sup.value } as never,
    },
  });
  return NextResponse.json({ ok: true });
}
