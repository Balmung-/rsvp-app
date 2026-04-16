import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["SMS", "EMAIL"]),
  locale: z.enum(["en", "ar"]),
  subject: z.string().max(200).nullable().optional(),
  preheader: z.string().max(200).nullable().optional(),
  bodyMarkdown: z.string().max(20000).nullable().optional(),
  smsBody: z.string().max(1600).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;

  let parsed;
  try { parsed = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  if (parsed.isDefault) {
    await prisma.template.updateMany({
      where: { organizationId: user.organizationId, channel: parsed.channel, locale: parsed.locale, isDefault: true },
      data: { isDefault: false },
    });
  }

  const created = await prisma.template.create({
    data: {
      organizationId: user.organizationId,
      name: parsed.name,
      channel: parsed.channel,
      locale: parsed.locale,
      subject: parsed.subject ?? null,
      preheader: parsed.preheader ?? null,
      bodyMarkdown: parsed.bodyMarkdown ?? null,
      smsBody: parsed.smsBody ?? null,
      isDefault: parsed.isDefault ?? false,
    },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Template",
      entityId: created.id,
      action: "template.create",
    },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
