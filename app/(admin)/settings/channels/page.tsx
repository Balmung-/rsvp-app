import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";

export default async function ChannelSettingsPage(): Promise<React.ReactElement> {
  await requireUser();
  const smsProvider = process.env.SMS_PROVIDER ?? "mock";
  const emailProvider = process.env.EMAIL_PROVIDER ?? "mock";

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  const base = process.env.APP_URL ?? `${proto}://${host}`;

  return (
    <div className="max-w-2xl">
      <h1 className="text-h2 text-text mb-2">Channels</h1>
      <p className="text-body text-text-muted mb-8">
        Active providers and the webhook URLs to register with each.
      </p>

      <div className="flex flex-col gap-10">
        <Channel
          title="SMS"
          provider={smsProvider}
          webhookUrl={`${base}/api/webhooks/sms/${smsProvider}`}
        />
        <Channel
          title="Email"
          provider={emailProvider}
          webhookUrl={`${base}/api/webhooks/email/${emailProvider}`}
        />
      </div>

      <p className="text-small text-text-muted mt-10">
        Providers are selected via the <code className="text-text">SMS_PROVIDER</code> and{" "}
        <code className="text-text">EMAIL_PROVIDER</code> environment variables on the host. Switch to live by setting credentials and redeploying — no code change.
      </p>
    </div>
  );
}

function Channel({
  title,
  provider,
  webhookUrl,
}: {
  title: string;
  provider: string;
  webhookUrl: string;
}): React.ReactElement {
  const isMock = provider === "mock";
  return (
    <section className="border-t border-border pt-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-h3 text-text">{title}</h2>
        <span className={`text-small ${isMock ? "text-text-muted" : "text-success"}`}>
          {isMock ? "Mock mode" : "Live"}
        </span>
      </div>

      <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-body">
        <dt className="text-text-muted">Provider</dt>
        <dd className="text-text">{provider}</dd>
        <dt className="text-text-muted">Webhook URL</dt>
        <dd>
          <code className="text-small font-mono text-text break-all bg-surface-alt px-2 py-1 rounded">{webhookUrl}</code>
          <p className="text-small text-text-subtle mt-2">
            Register this URL in your {provider} dashboard so delivery events flow back into the app.
          </p>
        </dd>
      </dl>
    </section>
  );
}
