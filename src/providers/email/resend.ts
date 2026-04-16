import type { EmailProvider } from "../types";

/**
 * Resend adapter — STUB. Wire up when credentials are provisioned.
 *
 * Required env:
 *   RESEND_API_KEY
 *   RESEND_WEBHOOK_SECRET
 *
 * Webhook URL to register with Resend:
 *   {APP_URL}/api/webhooks/email/resend
 *
 * Replace with SES, Postmark, or SendGrid by implementing the same
 * EmailProvider interface. No other code needs to change.
 */
export const resendEmail: EmailProvider = {
  name: "resend",
  capabilities: {
    supportsScheduling: true,
    supportsDeliveryWebhooks: true,
    supportsOpenTracking: true,
    supportsClickTracking: true,
    supportsInboundReplies: false,
    requiresApprovedSenderId: false,
  },

  async send(_input) {
    throw new Error(
      "resendEmail.send not implemented. Set EMAIL_PROVIDER=mock for development, or fill credentials and implement this adapter."
    );
  },

  async verifyWebhook(_req) {
    throw new Error("resendEmail.verifyWebhook not implemented.");
  },

  async parseWebhook(_req) {
    throw new Error("resendEmail.parseWebhook not implemented.");
  },
};
