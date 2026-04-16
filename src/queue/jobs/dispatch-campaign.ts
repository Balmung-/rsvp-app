import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { mintRsvpToken } from "@/lib/tokens";
import { renderEmail, renderSms } from "@/domain/messages/render";
import { getBoss, QUEUES } from "../boss";
import type { Channel } from "@prisma/client";

export interface DispatchCampaignPayload {
  campaignId: string;
}

interface AudienceFilter {
  rsvpStatus?: ("PENDING" | "ACCEPTED" | "DECLINED")[];
  tags?: string[];
  inviteeIds?: string[];
}

export async function handleDispatchCampaign(payload: DispatchCampaignPayload): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: payload.campaignId },
    include: {
      event: { include: { organization: true } },
      template: true,
    },
  });
  if (!campaign) {
    log.warn("dispatch.campaign_not_found", { campaignId: payload.campaignId });
    return;
  }

  if (campaign.status !== "QUEUED" && campaign.status !== "SENDING") {
    log.info("dispatch.skipping_non_queued", { campaignId: campaign.id, status: campaign.status });
    return;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING", startedAt: campaign.startedAt ?? new Date() },
  });

  const filter = (campaign.audienceFilterJson ?? {}) as AudienceFilter;
  const invitees = await prisma.invitee.findMany({
    where: {
      eventId: campaign.eventId,
      ...(filter.rsvpStatus && filter.rsvpStatus.length > 0 ? { rsvpStatus: { in: filter.rsvpStatus } } : {}),
      ...(filter.inviteeIds && filter.inviteeIds.length > 0 ? { id: { in: filter.inviteeIds } } : {}),
    },
    include: { guest: true },
  });

  log.info("dispatch.fanout_start", { campaignId: campaign.id, count: invitees.length });

  const providerName = campaign.channel === "EMAIL"
    ? (process.env.EMAIL_PROVIDER ?? "mock")
    : (process.env.SMS_PROVIDER ?? "mock");

  const boss = await getBoss();

  for (const invitee of invitees) {
    const g = invitee.guest;

    // Suppression check
    const suppressionValue = campaign.channel === "EMAIL" ? g.email : g.phoneE164;
    if (!suppressionValue) {
      log.info("dispatch.skip_no_contact", { inviteeId: invitee.id, channel: campaign.channel });
      continue;
    }
    const suppressed = await prisma.suppression.findUnique({
      where: {
        organizationId_channel_value: {
          organizationId: campaign.event.organizationId,
          channel: campaign.channel,
          value: suppressionValue,
        },
      },
    });
    if (suppressed) {
      log.info("dispatch.suppressed", { inviteeId: invitee.id, reason: suppressed.reason });
      continue;
    }

    // Mint a fresh token for this campaign? No — token is stable per invitee
    // unless admin explicitly rotates. We just compute the token value from
    // the stored hash is impossible (hash is one-way), so we re-mint and
    // update tokenHash only on creation / rotation. For sending, we mint from
    // current version, which produces the same token body and matches hash.
    const { token, tokenHash } = mintRsvpToken({ i: invitee.id, v: invitee.tokenVersion });

    // If the invitee was created without setting tokenHash (shouldn't happen),
    // ensure it's set now.
    if (invitee.tokenHash !== tokenHash) {
      await prisma.invitee.update({
        where: { id: invitee.id },
        data: { tokenHash },
      });
    }

    const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
    const rsvpLink = `${baseUrl}/r/${token}`;
    const unsubscribeLink = `${baseUrl}/u/${token}`;
    const locale: "en" | "ar" = (g.preferredLocale === "en" || g.preferredLocale === "ar")
      ? g.preferredLocale
      : (campaign.event.organization.defaultLocale === "en" ? "en" : "ar");

    let renderedSubject: string | null = null;
    let renderedText: string | null = null;
    let renderedHtml: string | null = null;

    if (campaign.channel === "EMAIL") {
      const out = await renderEmail(campaign.template, {
        org: campaign.event.organization,
        event: campaign.event,
        guest: g,
        invitee,
        rsvpLink,
        unsubscribeLink,
        locale,
      });
      renderedSubject = out.subject;
      renderedText = out.text;
      renderedHtml = out.html;
    } else {
      const out = renderSms(campaign.template, {
        org: campaign.event.organization,
        event: campaign.event,
        guest: g,
        invitee,
        rsvpLink,
        unsubscribeLink,
        locale,
      });
      renderedText = out.body;
      if (out.warnings.length > 0) {
        log.warn("dispatch.sms_overlength", { inviteeId: invitee.id, warnings: out.warnings });
      }
    }

    const senderIdentity = campaign.channel === "EMAIL"
      ? (process.env.EMAIL_FROM_DEFAULT ?? "events@localhost")
      : "MOM";

    const outbound = await prisma.outboundMessage.create({
      data: {
        campaignId: campaign.id,
        eventId: campaign.eventId,
        inviteeId: invitee.id,
        channel: campaign.channel as Channel,
        provider: providerName,
        senderIdentity,
        recipientEmail: campaign.channel === "EMAIL" ? g.email : null,
        recipientPhoneE164: campaign.channel === "SMS" ? g.phoneE164 : null,
        renderedSubject,
        renderedText,
        renderedHtml,
        trackedLink: rsvpLink,
        status: "QUEUED",
      },
    });

    await boss.send(QUEUES.sendMessage, { outboundMessageId: outbound.id });
  }

  // We do not mark COMPLETED here — that happens when all messages leave
  // the QUEUED state. A maintenance sweep can close campaigns, or a cron.
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

  log.info("dispatch.fanout_done", { campaignId: campaign.id });
}
