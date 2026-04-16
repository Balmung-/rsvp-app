import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { canAdvance } from "@/domain/messages/status";
import type { MessageStatus } from "@prisma/client";
import type { NormalizedDeliveryEvent, NormalizedDeliveryStatus } from "@/providers/types";

export interface IngestWebhookPayload {
  webhookReceiptId: string;
}

const TO_PRISMA: Record<NormalizedDeliveryStatus, MessageStatus> = {
  accepted: "ACCEPTED",
  sent: "SENT",
  delivered: "DELIVERED",
  opened: "OPENED",
  clicked: "CLICKED",
  bounced: "BOUNCED",
  complained: "COMPLAINED",
  failed: "FAILED",
};

export async function handleIngestWebhook(payload: IngestWebhookPayload): Promise<void> {
  const receipt = await prisma.webhookReceipt.findUnique({
    where: { id: payload.webhookReceiptId },
  });
  if (!receipt) {
    log.warn("ingest.receipt_not_found", { id: payload.webhookReceiptId });
    return;
  }
  if (receipt.processedAt) {
    log.info("ingest.already_processed", { id: receipt.id });
    return;
  }

  try {
    const events = Array.isArray(receipt.payloadJson) ? receipt.payloadJson : [receipt.payloadJson];
    for (const raw of events as unknown as NormalizedDeliveryEvent[]) {
      const msg = await prisma.outboundMessage.findFirst({
        where: { provider: raw.provider, providerMessageId: raw.externalMessageId },
        select: { id: true, status: true },
      });
      if (!msg) {
        log.warn("ingest.message_not_found", { externalMessageId: raw.externalMessageId });
        continue;
      }
      const next = TO_PRISMA[raw.status];
      if (!canAdvance(msg.status, next)) continue;

      const now = new Date(raw.occurredAt);
      await prisma.outboundMessage.update({
        where: { id: msg.id },
        data: {
          status: next,
          ...(next === "DELIVERED" ? { deliveredAt: now } : {}),
          ...(next === "OPENED" ? { openedAt: now } : {}),
          ...(next === "CLICKED" ? { clickedAt: now } : {}),
          ...(next === "BOUNCED" || next === "FAILED"
            ? {
                lastErrorCode: raw.errorCode ?? null,
                lastErrorMessage: raw.errorMessage?.slice(0, 500) ?? null,
              }
            : {}),
        },
      });
    }

    await prisma.webhookReceipt.update({
      where: { id: receipt.id },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.webhookReceipt.update({
      where: { id: receipt.id },
      data: { processingError: message.slice(0, 500) },
    });
    throw err;
  }
}
