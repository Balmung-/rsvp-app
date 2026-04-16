import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { mintRsvpToken } from "@/lib/tokens";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Row = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  fullName: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(40).optional(),
  preferredLocale: z.enum(["en", "ar"]).optional(),
  partySizeLimit: z.coerce.number().int().min(1).max(20).optional(),
  allowPlusOne: z.preprocess((v) => {
    if (typeof v === "string") return ["true", "1", "yes"].includes(v.toLowerCase());
    return v;
  }, z.boolean()).optional(),
  tags: z.string().optional(),
});

const Body = z.object({
  rows: z.array(Row).min(1).max(5000),
});

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
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let parsed;
  try { parsed = Body.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of parsed.rows) {
    const fullName = raw.fullName || [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
    if (!fullName && !raw.email && !raw.phone) {
      skipped++;
      continue;
    }
    const phoneE164 = raw.phone ? normalizePhone(raw.phone) : null;
    if (raw.phone && !phoneE164) {
      log.warn("import.invalid_phone", { value: "[redacted]" });
    }

    // Dedup guest within org by email or phone.
    let guest = raw.email
      ? await prisma.guest.findFirst({
          where: { organizationId: user.organizationId, email: raw.email.toLowerCase() },
        })
      : null;
    if (!guest && phoneE164) {
      guest = await prisma.guest.findFirst({
        where: { organizationId: user.organizationId, phoneE164 },
      });
    }

    if (guest) {
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          firstName: raw.firstName ?? guest.firstName,
          lastName: raw.lastName ?? guest.lastName,
          fullName: fullName || guest.fullName,
          email: raw.email?.toLowerCase() ?? guest.email,
          phoneE164: phoneE164 ?? guest.phoneE164,
          preferredLocale: raw.preferredLocale ?? guest.preferredLocale,
        },
      });
    } else {
      guest = await prisma.guest.create({
        data: {
          organizationId: user.organizationId,
          firstName: raw.firstName,
          lastName: raw.lastName,
          fullName: fullName || raw.email || raw.phone || "Guest",
          email: raw.email?.toLowerCase(),
          phoneE164,
          preferredLocale: raw.preferredLocale,
        },
      });
    }

    const existing = await prisma.invitee.findUnique({
      where: { eventId_guestId: { eventId, guestId: guest.id } },
    });
    if (existing) {
      await prisma.invitee.update({
        where: { id: existing.id },
        data: {
          partySizeLimit: raw.partySizeLimit ?? existing.partySizeLimit,
          allowPlusOne: raw.allowPlusOne ?? existing.allowPlusOne,
          tagsJson: (raw.tags
            ? raw.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : existing.tagsJson) as never,
        },
      });
      updated++;
    } else {
      // Create with a placeholder tokenHash first, then mint & update.
      const tmpInvitee = await prisma.invitee.create({
        data: {
          eventId,
          guestId: guest.id,
          partySizeLimit: raw.partySizeLimit ?? 1,
          allowPlusOne: raw.allowPlusOne ?? false,
          tagsJson: raw.tags ? raw.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          tokenHash: `pending_${crypto.randomUUID()}`,
          tokenVersion: 1,
        },
      });
      const { tokenHash } = mintRsvpToken({ i: tmpInvitee.id, v: 1 });
      await prisma.invitee.update({
        where: { id: tmpInvitee.id },
        data: { tokenHash },
      });
      created++;
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      entityType: "Event",
      entityId: eventId,
      action: "invitee.import",
      metadataJson: { created, updated, skipped, rows: parsed.rows.length },
    },
  });

  return NextResponse.json({ ok: true, created, updated, skipped });
}
