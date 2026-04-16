import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { log } from "@/lib/logger";
import type { EmailProvider, NormalizedDeliveryEvent, NormalizedDeliveryStatus } from "../types";

const OUTBOX_DIR = path.join(process.cwd(), ".mock-outbox");

async function writeOutbox(id: string, subject: string, html: string, to: string): Promise<void> {
  try {
    await fs.mkdir(OUTBOX_DIR, { recursive: true });
    const safeId = id.replace(/[^\w.-]/g, "_");
    const wrapper = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:system-ui;padding:24px;background:#f7f5f0">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eae8e3;border-radius:12px;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #eae8e3;color:#5c5c60;font-size:13px">
      <div>To: ${escapeHtml(to)}</div>
      <div>Subject: <strong style="color:#0f0f10">${escapeHtml(subject)}</strong></div>
    </div>
    <div style="padding:20px">${html}</div>
  </div>
</body></html>`;
    await fs.writeFile(path.join(OUTBOX_DIR, `${safeId}.html`), wrapper, "utf8");
  } catch (err) {
    log.warn("mock.email.outbox_write_failed", { err: String(err) });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export const mockEmail: EmailProvider = {
  name: "mock",
  capabilities: {
    supportsScheduling: true,
    supportsDeliveryWebhooks: true,
    supportsOpenTracking: true,
    supportsClickTracking: true,
    supportsInboundReplies: false,
    requiresApprovedSenderId: false,
  },

  async send(input) {
    const externalMessageId = `mock_email_${randomUUID()}`;
    await writeOutbox(externalMessageId, input.subject, input.html, input.to);
    log.info("mock.email.send", {
      clientReference: input.clientReference,
      subject: input.subject,
      externalMessageId,
    });

    if (process.env.MOCK_AUTO_DELIVER === "true") {
      const { scheduleMockDelivery } = await import("@/queue/jobs/mock-deliver");
      const sequence: NormalizedDeliveryStatus[] = ["sent", "delivered"];
      if (Math.random() < Number(process.env.MOCK_AUTO_OPEN_RATE ?? 0.7)) {
        sequence.push("opened");
        if (Math.random() < Number(process.env.MOCK_AUTO_CLICK_RATE ?? 0.4)) {
          sequence.push("clicked");
        }
      }
      await scheduleMockDelivery({
        provider: "mock",
        channel: "email",
        externalMessageId,
        sequence,
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
      channel: "email",
      externalMessageId: e.externalMessageId,
      status: e.status,
      occurredAt: e.occurredAt,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      raw: e,
    }));
  },
};
