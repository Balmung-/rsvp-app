import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  defaultLocale: z.enum(["en", "ar"]).optional(),
  defaultTimezone: z.string().min(1).max(64).optional(),
  brandAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  supportEmail: z.string().email().max(320).nullable().optional().or(z.literal("").transform(() => null)),
  supportPhone: z.string().max(40).nullable().optional().or(z.literal("").transform(() => null)),
});

export async function PATCH(req: Request): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;

  let parsed;
  try { parsed = PatchSchema.parse(await req.json()); }
  catch (err) {
    return NextResponse.json({ ok: false, error: "BAD_INPUT", detail: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["name", "defaultLocale", "defaultTimezone", "brandAccent", "logoUrl", "supportEmail", "supportPhone"] as const) {
    if (parsed[k] !== undefined) data[k] = parsed[k];
  }

  await prisma.organization.update({ where: { id: user.organizationId }, data });
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Organization",
      entityId: user.organizationId,
      action: "organization.update",
      metadataJson: data as never,
    },
  });
  return NextResponse.json({ ok: true });
}
