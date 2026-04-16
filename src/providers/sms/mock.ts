import { randomUUID } from "node:crypto";
import { log } from "@/lib/logger";
import type { NormalizedDeliveryEvent, SmsProvider } from "../types";

export const mockSms: SmsProvider = {
  name: "mock",
  capabilities: {
    supportsScheduling: true,
    supportsDeliveryWebhooks: true,
    supportsOpenTracking: false,
    supportsClickTracking: true,
    supportsInboundReplies: false,
    requiresApprovedSenderId: true,
  },

  async send(input) {
    const externalMessageId = `mock_sms_${randomUUID()}`;
    log.info("mock.sms.send", {
      senderId: input.senderId,
      clientReference: input.clientReference,
      bodyLength: input.body.length,
      externalMessageId,
    });

    if (process.env.MOCK_AUTO_DELIVER === "true") {
      // Lazy-load to avoid circular imports at startup.
      const { scheduleMockDelivery } = await import("@/queue/jobs/mock-deliver");
      await scheduleMockDelivery({
        provider: "mock",
        channel: "sms",
        externalMessageId,
        sequence: ["sent", "delivered"],
      });
    }

    return {
      provider: "mock",
      externalMessageId,
      acceptedAt: new Date().toISOString(),
    };
  },

  async verifyWebhook(req) {
    return req.headers.get("x-mock-secret") === process.env.WEBHOOK_SHARED_SECRET;
  },

  async parseWebhook(req) {
    const body = (await req.json()) as NormalizedDeliveryEvent | NormalizedDeliveryEvent[];
    const arr = Array.isArray(body) ? body : [body];
    return arr.map((e) => ({
      provider: "mock",
      channel: "sms",
      externalMessageId: e.externalMessageId,
      status: e.status,
      occurredAt: e.occurredAt,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      raw: e,
    }));
  },
};
