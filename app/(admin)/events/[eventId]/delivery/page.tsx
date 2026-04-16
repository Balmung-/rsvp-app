import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/datetime";

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;
  const campaigns = await prisma.campaign.findMany({
    where: { eventId, event: { organizationId: user.organizationId } },
    include: { template: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = await Promise.all(
    campaigns.map(async (c) => {
      const rows = await prisma.outboundMessage.groupBy({
        where: { campaignId: c.id },
        by: ["status"],
        _count: { _all: true },
      });
      const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = r._count._all;
        return acc;
      }, {});
      return byStatus;
    })
  );

  const locale: "en" | "ar" = user.locale === "en" ? "en" : "ar";

  return (
    <div>
      <div className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Campaign</th>
              <th className="py-3 px-4 font-medium">Channel</th>
              <th className="py-3 px-4 font-medium text-end tabular-nums">Sent</th>
              <th className="py-3 px-4 font-medium text-end tabular-nums">Delivered</th>
              <th className="py-3 px-4 font-medium text-end tabular-nums">Opened</th>
              <th className="py-3 px-4 font-medium text-end tabular-nums">Clicked</th>
              <th className="py-3 px-4 font-medium text-end tabular-nums">Bounced</th>
              <th className="py-3 px-4 font-medium text-end">Status</th>
              <th className="py-3 px-4 font-medium text-end">Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const cnt = counts[i]!;
              const sent = (cnt.SENT ?? 0) + (cnt.DELIVERED ?? 0) + (cnt.OPENED ?? 0) + (cnt.CLICKED ?? 0) + (cnt.BOUNCED ?? 0) + (cnt.COMPLAINED ?? 0);
              const delivered = (cnt.DELIVERED ?? 0) + (cnt.OPENED ?? 0) + (cnt.CLICKED ?? 0) + (cnt.COMPLAINED ?? 0);
              const opened = (cnt.OPENED ?? 0) + (cnt.CLICKED ?? 0);
              const clicked = cnt.CLICKED ?? 0;
              const bounced = cnt.BOUNCED ?? 0;
              return (
                <tr key={c.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                  <td className="py-3 ps-0 pe-4 text-text">{c.template.name}</td>
                  <td className="py-3 px-4 text-text-muted">{c.channel.toLowerCase()}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">{sent}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">{delivered}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">{opened}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">{clicked}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">{bounced}</td>
                  <td className="py-3 px-4 text-end text-text-muted">{c.status.toLowerCase()}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-subtle">
                    {formatEventDateTime(c.createdAt, "Asia/Riyadh", locale)}
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-text-muted">
                  No campaigns yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
