export type Channel = "sms" | "email";

export type NormalizedDeliveryStatus =
  | "accepted"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed";

export interface ProviderCapabilities {
  supportsScheduling: boolean;
  supportsDeliveryWebhooks: boolean;
  supportsOpenTracking: boolean;
  supportsClickTracking: boolean;
  supportsInboundReplies: boolean;
  requiresApprovedSenderId: boolean;
}

export interface NormalizedSendResult {
  provider: string;
  externalMessageId: string;
  acceptedAt: string;
  raw?: unknown;
}

export interface NormalizedDeliveryEvent {
  provider: string;
  channel: Channel;
  externalMessageId: string;
  status: NormalizedDeliveryStatus;
  occurredAt: string;
  errorCode?: string;
  errorMessage?: string;
  raw: unknown;
}

export interface SmsSendInput {
  to: string;
  body: string;
  senderId: string;
  clientReference: string;
  webhookUrl: string;
}

export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  clientReference: string;
  webhookUrl: string;
}

export interface SmsProvider {
  name: string;
  capabilities: ProviderCapabilities;
  send(input: SmsSendInput): Promise<NormalizedSendResult>;
  verifyWebhook(req: Request): Promise<boolean>;
  parseWebhook(req: Request): Promise<NormalizedDeliveryEvent[]>;
}

export interface EmailProvider {
  name: string;
  capabilities: ProviderCapabilities;
  send(input: EmailSendInput): Promise<NormalizedSendResult>;
  verifyWebhook(req: Request): Promise<boolean>;
  parseWebhook(req: Request): Promise<NormalizedDeliveryEvent[]>;
}

export interface ProviderRegistry {
  sms(name: string): SmsProvider;
  email(name: string): EmailProvider;
  activeSms(): SmsProvider;
  activeEmail(): EmailProvider;
}
