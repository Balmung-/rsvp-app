import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { getBoss, QUEUES } from "../boss";
import type { NormalizedDeliveryStatus } from "@/providers/types";
import type { MessageStatus } from "@prisma/client";
import { canAdvance } from "@/domain/messages/status";

export interface MockDeliverPayload {
  provider: string;
  channel: "sms" | "email";
  externalMessageId: string;
  sequence: NormalizedDeliveryStatus[];
}

/**
 * Schedule a mock delivery sequence. Each step fires with a small stagger so
 * the UI can observe transitions. In production-grade mock we keep this under
 * 10 seconds total to match a realistic SMS/email delivery timeline.
 */
export async function scheduleMockDelivery(payload: MockDeliverPayload): Promise<void> {
  const boss = await getBoss();
  const baseDelayMs = 500;
  for (let i = 0; i < payload.sequence.length; i++) {
    const status = payload.sequence[i]!;
    const startAfterSeconds = (baseDelayMs + i * 900 + Math.floor(Math.random() * 400)) / 1000;
    await boss.send(
      QUEUES.mockDeliver,
      { ...payload, status } satisfies MockDeliverStepPayload,
      { startAfter: Math.ceil(startAfterSeconds) }
    );
  }
}

export interface MockDeliverStepPayload extends MockDeliverPayload {
  status: NormalizedDeliveryStatus;
}

const TO_PRISMA_STATUS: Record<NormalizedDeliveryStatus, MessageStatus> = {
  accepted: "ACCEPTED",
  sent: "SENT",
  delivered: "DELIVERED",
  opened: "OPENED",
  clicked: "CLICKED",
  bounced: "BOUNCED",
  complained: "COMPLAINED",
  failed: "FAILED",
};

export async function handleMockDeliverStep(step: MockDeliverStepPayload): Promise<void> {
  const msg = await prisma.outboundMessage.findFirst({
    where: {
      provider: step.provider,
      providerMessageId: step.externalMessageId,
    },
    select: { id: true, status: true },
  });
  if (!msg) {
    log.warn("mock.deliver.message_not_found", { externalMessageId: step.externalMessageId });
    return;
  }
  const next = TO_PRISMA_STATUS[step.status];
  if (!canAdvance(msg.status, next)) {
    log.debug("mock.deliver.skipped_downgrade", { id: msg.id, from: msg.status, to: next });
    return;
  }
  const now = new Date();
  await prisma.outboundMessage.update({
    where: { id: msg.id },
    data: {
      status: next,
      ...(next === "SENT" ? { acceptedAt: msg ? undefined : undefined } : {}),
      ...(next === "DELIVERED" ? { deliveredAt: now } : {}),
      ...(next === "OPENED" ? { openedAt: now } : {}),
      ...(next === "CLICKED" ? { clickedAt: now } : {}),
    },
  });
  log.info("mock.deliver.advanced", { id: msg.id, to: next });
}
