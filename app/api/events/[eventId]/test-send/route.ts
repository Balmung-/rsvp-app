import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/auth";
import { renderEmail, renderSms } from "@/domain/messages/render";
import { registry } from "@/providers/registry";
import { normalizePhone } from "@/lib/phone";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  templateId: z.string().min(1),
  to: z.string().min(1).max(320),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  const gate = await requireRoleApi(["OWNER", "EDITOR"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  const user = gate.user;
  const { eventId } = await params;

  let parsed;
  try { parsed = Body.parse(await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 }); }

  const [event, template] = await Promise.all([
    prisma.event.findFirst({
      where: { id: eventId, organizationId: user.organizationId },
      include: { organization: true },
    }),
    prisma.template.findFirst({
      where: { id: parsed.templateId, organizationId: user.organizationId },
    }),
  ]);
  if (!event) return NextResponse.json({ ok: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  if (!template) return NextResponse.json({ ok: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });

  const isEmail = parsed.to.includes("@");
  const phoneE164 = isEmail ? null : normalizePhone(parsed.to);

  if (template.channel === "SMS" && !phoneE164) {
    return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
  }
  if (template.channel === "EMAIL" && !isEmail) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  const locale: "en" | "ar" = template.locale === "en" ? "en" : "ar";

  // Synthetic context. RSVP link is a placeholder so the admin can see the
  // template structure without a real invitee.
  const fakeRsvpLink = `${process.env.APP_URL ?? "http://localhost:3000"}/r/preview-test`;
  const fakeGuest = {
    id: "test",
    organizationId: user.organizationId,
    firstName: "Test",
    lastName: "User",
    fullName: "Test User",
    email: isEmail ? parsed.to : null,
    phoneE164,
    preferredLocale: locale,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const fakeInvitee = {
    id: "test",
    eventId: event.id,
    guestId: "test",
    partySizeLimit: 1,
    allowPlusOne: false,
    tagsJson: [],
    rsvpStatus: "PENDING" as const,
    respondedAt: null,
    responseSource: null,
    tokenHash: "test",
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    if (template.channel === "EMAIL") {
      const out = renderEmail(template, {
        org: event.organization, event, guest: fakeGuest, invitee: fakeInvitee, rsvpLink: fakeRsvpLink, locale,
      });
      const fromDefault = process.env.EMAIL_FROM_DEFAULT ?? `${event.organization.name} <events@localhost>`;
      const match = fromDefault.match(/^(.*?)\s*<(.+?)>$/);
      const fromName = (match?.[1] ?? event.organization.name).trim() || event.organization.name;
      const fromEmail = (match?.[2] ?? fromDefault).trim();
      await registry.activeEmail().send({
        to: parsed.to,
        subject: `[TEST] ${out.subject}`,
        html: out.html,
        text: out.text,
        fromEmail,
        fromName,
        clientReference: `test_${Date.now()}`,
        webhookUrl: "",
      });
    } else {
      const out = renderSms(template, {
        org: event.organization, event, guest: fakeGuest, invitee: fakeInvitee, rsvpLink: fakeRsvpLink, locale,
      });
      await registry.activeSms().send({
        to: phoneE164!,
        body: `[TEST] ${out.body}`,
        senderId: "MOM",
        clientReference: `test_${Date.now()}`,
        webhookUrl: "",
      });
    }
    log.info("test_send.ok", { eventId, channel: template.channel });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("test_send.failed", { eventId, err: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
