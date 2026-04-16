import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { renderEmail, renderSms } from "@/domain/messages/render";
import { mintRsvpToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, event: { organizationId: user.organizationId } },
    include: {
      event: { include: { organization: true } },
      template: true,
    },
  });
  if (!campaign) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const invitees = await prisma.invitee.findMany({
    where: { eventId: campaign.eventId },
    include: { guest: true },
    take: 5,
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const invitee of invitees) {
    const { token } = mintRsvpToken({ i: invitee.id, v: invitee.tokenVersion });
    const rsvpLink = `${process.env.APP_URL ?? "http://localhost:3000"}/r/${token}`;
    const locale: "en" | "ar" =
      (invitee.guest.preferredLocale === "en" || invitee.guest.preferredLocale === "ar")
        ? invitee.guest.preferredLocale
        : (campaign.event.organization.defaultLocale === "en" ? "en" : "ar");

    if (campaign.channel === "EMAIL") {
      const out = await renderEmail(campaign.template, {
        org: campaign.event.organization,
        event: campaign.event,
        guest: invitee.guest,
        invitee,
        rsvpLink,
        locale,
      });
      results.push({
        guest: invitee.guest.fullName,
        locale,
        subject: out.subject,
        preheader: out.preheader,
        html: out.html,
        text: out.text,
      });
    } else {
      const out = renderSms(campaign.template, {
        org: campaign.event.organization,
        event: campaign.event,
        guest: invitee.guest,
        invitee,
        rsvpLink,
        locale,
      });
      results.push({
        guest: invitee.guest.fullName,
        locale,
        body: out.body,
        warnings: out.warnings,
      });
    }
  }

  return NextResponse.json({ ok: true, channel: campaign.channel, samples: results });
}
