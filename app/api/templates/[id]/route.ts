import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  channel: z.enum(["SMS", "EMAIL"]).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  subject: z.string().max(200).nullable().optional(),
  preheader: z.string().max(200).nullable().optional(),
  bodyMarkdown: z.string().max(20000).nullable().optional(),
  smsBody: z.string().max(1600).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { id } = await params;

  const tmpl = await prisma.template.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!tmpl) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let parsed;
  try { parsed = PatchSchema.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  // If becoming default, demote any other default for the same (channel, locale)
  if (parsed.isDefault === true) {
    const channel = parsed.channel ?? tmpl.channel;
    const locale = parsed.locale ?? tmpl.locale;
    await prisma.template.updateMany({
      where: { organizationId: user.organizationId, channel, locale, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["name", "channel", "locale", "subject", "preheader", "bodyMarkdown", "smsBody", "isDefault"] as const) {
    if (parsed[k] !== undefined) data[k] = parsed[k];
  }

  await prisma.template.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Template",
      entityId: id,
      action: "template.update",
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { id } = await params;

  const tmpl = await prisma.template.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!tmpl) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // Prevent deletion if any campaign references this template.
  const used = await prisma.campaign.count({ where: { templateId: id } });
  if (used > 0) {
    return NextResponse.json({ ok: false, error: "TEMPLATE_IN_USE", campaigns: used }, { status: 409 });
  }

  await prisma.template.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Template",
      entityId: id,
      action: "template.delete",
    },
  });
  return NextResponse.json({ ok: true });
}
