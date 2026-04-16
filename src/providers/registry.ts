import { mockSms } from "./sms/mock";
import { twilioSms } from "./sms/twilio";
import { mockEmail } from "./email/mock";
import { resendEmail } from "./email/resend";
import type { EmailProvider, ProviderRegistry, SmsProvider } from "./types";

const smsByName: Record<string, SmsProvider> = {
  mock: mockSms,
  twilio: twilioSms,
};

const emailByName: Record<string, EmailProvider> = {
  mock: mockEmail,
  resend: resendEmail,
};

function resolveSms(name: string): SmsProvider {
  const p = smsByName[name];
  if (!p) throw new Error(`Unknown SMS provider: ${name}`);
  return p;
}

function resolveEmail(name: string): EmailProvider {
  const p = emailByName[name];
  if (!p) throw new Error(`Unknown email provider: ${name}`);
  return p;
}

export const registry: ProviderRegistry = {
  sms: (n) => resolveSms(n),
  email: (n) => resolveEmail(n),
  activeSms: () => resolveSms(process.env.SMS_PROVIDER ?? "mock"),
  activeEmail: () => resolveEmail(process.env.EMAIL_PROVIDER ?? "mock"),
};
