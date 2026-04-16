import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function BrandSettingsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return <div />;
  return (
    <div className="max-w-xl">
      <h1 className="text-h2 text-text mb-8">Brand</h1>
      <dl className="flex flex-col gap-5">
        <Row label="Name" value={org.name} />
        <Row label="Default locale" value={org.defaultLocale} />
        <Row label="Default timezone" value={org.defaultTimezone} />
        <Row
          label="Brand accent"
          value={
            <span className="inline-flex items-center gap-3">
              <span aria-hidden className="inline-block h-4 w-4 rounded-full border border-border-strong" style={{ backgroundColor: org.brandAccent }} />
              <span className="tabular-nums">{org.brandAccent}</span>
            </span>
          }
        />
        <Row label="Logo" value={org.logoUrl ?? "—"} />
        <Row label="Support email" value={org.supportEmail ?? "—"} />
        <Row label="Support phone" value={org.supportPhone ?? "—"} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-6">
      <dt className="w-48 text-small text-text-subtle shrink-0">{label}</dt>
      <dd className="text-body text-text">{value}</dd>
    </div>
  );
}
