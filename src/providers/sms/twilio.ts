import type { SmsProvider } from "../types";

/**
 * Twilio adapter — STUB. Wire up when credentials are provisioned.
 *
 * Required env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_MESSAGING_SERVICE_SID
 *   TWILIO_WEBHOOK_SIGNING_KEY
 *
 * Webhook URL to register with Twilio:
 *   {APP_URL}/api/webhooks/sms/twilio
 *
 * Replace with Unifonic (or similar local KSA provider) by implementing the
 * same SmsProvider interface. No other code needs to change.
 */
export const twilioSms: SmsProvider = {
  name: "twilio",
  capabilities: {
    supportsScheduling: true,
    supportsDeliveryWebhooks: true,
    supportsOpenTracking: false,
    supportsClickTracking: true,
    supportsInboundReplies: true,
    requiresApprovedSenderId: true,
  },

  async send(_input) {
    throw new Error(
      "twilioSms.send not implemented. Set SMS_PROVIDER=mock for development, or fill credentials and implement this adapter."
    );
  },

  async verifyWebhook(_req) {
    throw new Error("twilioSms.verifyWebhook not implemented.");
  },

  async parseWebhook(_req) {
    throw new Error("twilioSms.parseWebhook not implemented.");
  },
};
