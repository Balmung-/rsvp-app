import { requireUser } from "@/lib/auth";

export default async function ChannelSettingsPage(): Promise<React.ReactElement> {
  await requireUser();
  const smsProvider = process.env.SMS_PROVIDER ?? "mock";
  const emailProvider = process.env.EMAIL_PROVIDER ?? "mock";
  return (
    <div className="max-w-xl">
      <h1 className="text-h2 text-text mb-8">Channels</h1>
      <div className="flex flex-col gap-8">
        <Row name="SMS" provider={smsProvider} />
        <Row name="Email" provider={emailProvider} />
        <p className="text-small text-text-muted">
          Providers are selected via <code className="text-text">SMS_PROVIDER</code> and{" "}
          <code className="text-text">EMAIL_PROVIDER</code> environment variables. Switch to live
          by setting credentials on the server and redeploying.
        </p>
      </div>
    </div>
  );
}

function Row({ name, provider }: { name: string; provider: string }): React.ReactElement {
  const isMock = provider === "mock";
  return (
    <div className="flex items-center justify-between pb-5 border-b border-border">
      <div>
        <div className="text-body text-text">{name}</div>
        <div className="text-small text-text-subtle">Active provider: {provider}</div>
      </div>
      <div className="text-small text-text-muted">{isMock ? "Mock mode" : "Live"}</div>
    </div>
  );
}
