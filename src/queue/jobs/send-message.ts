import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { registry } from "@/providers/registry";

export interface SendMessagePayload {
  outboundMessageId: string;
}

export async function handleSendMessage(payload: SendMessagePayload): Promise<void> {
  const msg = await prisma.outboundMessage.findUnique({
    where: { id: payload.outboundMessageId },
    include: { event: { include: { organization: true } } },
  });
  if (!msg) {
    log.warn("send.message_not_found", { id: payload.outboundMessageId });
    return;
  }
  if (msg.status !== "QUEUED") {
    log.info("send.skipping_non_queued", { id: msg.id, status: msg.status });
    return;
  }

  const webhookUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/api/webhooks/${msg.channel.toLowerCase()}/${msg.provider}`;

  try {
    if (msg.channel === "SMS") {
      if (!msg.recipientPhoneE164) throw new Error("missing recipientPhoneE164");
      const result = await registry.sms(msg.provider).send({
        to: msg.recipientPhoneE164,
        body: msg.renderedText ?? "",
        senderId: msg.senderIdentity,
        clientReference: msg.id,
        webhookUrl,
      });
      await prisma.outboundMessage.update({
        where: { id: msg.id },
        data: {
          status: "ACCEPTED",
          provider: result.provider,
          providerMessageId: result.externalMessageId,
          acceptedAt: new Date(result.acceptedAt),
        },
      });
    } else {
      if (!msg.recipientEmail) throw new Error("missing recipientEmail");
      const fromDefault = process.env.EMAIL_FROM_DEFAULT ?? "Events <events@localhost>";
      const match = fromDefault.match(/^(.*?)\s*<(.+?)>$/);
      const fromName = (match?.[1] ?? msg.event.organization.name).trim() || msg.event.organization.name;
      const fromEmail = (match?.[2] ?? fromDefault).trim();

      const result = await registry.email(msg.provider).send({
        to: msg.recipientEmail,
        subject: msg.renderedSubject ?? "",
        html: msg.renderedHtml ?? "",
        text: msg.renderedText ?? "",
        fromEmail,
        fromName,
        clientReference: msg.id,
        webhookUrl,
      });
      await prisma.outboundMessage.update({
        where: { id: msg.id },
        data: {
          status: "ACCEPTED",
          provider: result.provider,
          providerMessageId: result.externalMessageId,
          acceptedAt: new Date(result.acceptedAt),
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("send.failed", { id: msg.id, err: message });
    await prisma.outboundMessage.update({
      where: { id: msg.id },
      data: {
        status: "FAILED",
        lastErrorCode: "SEND_FAILED",
        lastErrorMessage: message.slice(0, 500),
      },
    });
    throw err;
  }
}
