import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/datetime";
import { StatusDot } from "@/ui/StatusDot";
import { EmptyState } from "@/ui/EmptyState";

const STATUS: Record<string, "muted" | "neutral" | "success" | "danger" | "warn"> = {
  DRAFT: "muted",
  QUEUED: "warn",
  SENDING: "warn",
  PAUSED: "muted",
  COMPLETED: "success",
  FAILED: "danger",
};

export default async function CampaignsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const campaigns = await prisma.campaign.findMany({
    where: { event: { organizationId: user.organizationId } },
    include: {
      event: { select: { id: true, title: true, timezone: true } },
      template: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const counts = await Promise.all(
    campaigns.map((c) =>
      prisma.outboundMessage.groupBy({
        where: { campaignId: c.id },
        by: ["status"],
        _count: { _all: true },
      })
    )
  );

  const locale: "en" | "ar" = user.locale === "en" ? "en" : "ar";

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-h2 text-text">Campaigns</h1>
        <span className="text-small text-text-muted tabular-nums">{campaigns.length} total</span>
      </header>

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Open an event and use Compose to send your first campaign."
        />
      ) : (
        <div className="border-t border-border">
          <table className="w-full text-body">
            <thead>
              <tr className="text-micro text-text-subtle text-start">
                <th className="py-3 ps-0 pe-4 font-medium">Template</th>
                <th className="py-3 px-4 font-medium">Event</th>
                <th className="py-3 px-4 font-medium">Channel</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Sent</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Delivered</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Opened</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Clicked</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Bounced</th>
                <th className="py-3 px-4 font-medium text-end">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const cnt = counts[i]!.reduce<Record<string, number>>((a, r) => { a[r.status] = r._count._all; return a; }, {});
                const sent = (cnt.SENT ?? 0) + (cnt.DELIVERED ?? 0) + (cnt.OPENED ?? 0) + (cnt.CLICKED ?? 0) + (cnt.BOUNCED ?? 0) + (cnt.COMPLAINED ?? 0);
                const delivered = (cnt.DELIVERED ?? 0) + (cnt.OPENED ?? 0) + (cnt.CLICKED ?? 0) + (cnt.COMPLAINED ?? 0);
                const opened = (cnt.OPENED ?? 0) + (cnt.CLICKED ?? 0);
                const clicked = cnt.CLICKED ?? 0;
                const bounced = cnt.BOUNCED ?? 0;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                    <td className="py-3 ps-0 pe-4 text-text">{c.template.name}</td>
                    <td className="py-3 px-4 text-text-muted">
                      <Link href={`/events/${c.event.id}/delivery`} className="hover:text-text hover:underline decoration-border-strong">
                        {c.event.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{c.channel.toLowerCase()}</td>
                    <td className="py-3 px-4 text-text-muted">
                      <span className="inline-flex items-center gap-2">
                        <StatusDot variant={STATUS[c.status] ?? "muted"} />
                        {c.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end tabular-nums text-text-muted">{sent}</td>
                    <td className="py-3 px-4 text-end tabular-nums text-text-muted">{delivered}</td>
                    <td className="py-3 px-4 text-end tabular-nums text-text-muted">{opened}</td>
                    <td className="py-3 px-4 text-end tabular-nums text-text-muted">{clicked}</td>
                    <td className="py-3 px-4 text-end tabular-nums text-text-muted">{bounced}</td>
                    <td className="py-3 px-4 text-end tabular-nums text-text-subtle">
                      {formatEventDateTime(c.createdAt, c.event.timezone, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
