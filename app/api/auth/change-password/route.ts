import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserApi } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await requireUserApi();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;

  let parsed;
  try { parsed = Body.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  if (parsed.currentPassword === parsed.newPassword) {
    return NextResponse.json({ ok: false, error: "NEW_PASSWORD_SAME" }, { status: 400 });
  }

  const db = await prisma.user.findUnique({ where: { id: user.id } });
  if (!db?.passwordHash) return NextResponse.json({ ok: false, error: "NO_PASSWORD_SET" }, { status: 409 });
  const match = await verifyPassword(parsed.currentPassword, db.passwordHash);
  if (!match) return NextResponse.json({ ok: false, error: "WRONG_CURRENT_PASSWORD" }, { status: 403 });

  const hash = await hashPassword(parsed.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "user.change_password",
    },
  });

  return NextResponse.json({ ok: true });
}
