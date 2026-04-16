import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/datetime";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;

  const [event, invited, accepted, declined, pending, recentMessages, recentResponses] = await Promise.all([
    prisma.event.findFirst({ where: { id: eventId, organizationId: user.organizationId } }),
    prisma.invitee.count({ where: { eventId } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "ACCEPTED" } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "DECLINED" } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "PENDING" } }),
    prisma.outboundMessage.findMany({
      where: { eventId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { invitee: { include: { guest: true } } },
    }),
    prisma.rsvpResponse.findMany({
      where: { invitee: { eventId } },
      orderBy: { submittedAt: "desc" },
      take: 6,
      include: { invitee: { include: { guest: true } } },
    }),
  ]);

  if (!event) return <div />;

  const pct = invited > 0 ? Math.round((accepted / invited) * 100) : 0;
  const locale: "en" | "ar" = user.locale === "en" ? "en" : "ar";

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="grid grid-cols-4 gap-8 md:gap-14">
          {[
            { label: "Invited", value: invited },
            { label: "Accepted", value: accepted },
            { label: "Declined", value: declined },
            { label: "Pending", value: pending },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-micro text-text-subtle mb-2">{m.label}</div>
              <div className="text-[40px] leading-[44px] font-medium tracking-tight text-text tabular-nums">{m.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 relative h-px bg-border">
          <div className="absolute inset-y-0 start-0 bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-micro text-text-subtle">{pct}% accepted</div>
      </section>

      <section>
        <h2 className="text-small text-text-subtle mb-4">Recent activity</h2>
        <ul className="flex flex-col gap-1">
          {[...recentResponses.map((r) => ({
            t: r.submittedAt,
            text: `${r.invitee.guest.fullName} ${r.status === "ACCEPTED" ? "accepted" : "declined"}`,
          })),
          ...recentMessages.map((m) => ({
            t: m.updatedAt,
            text: `${m.channel.toLowerCase()} → ${m.invitee.guest.fullName}: ${m.status.toLowerCase()}`,
          }))]
            .sort((a, b) => b.t.getTime() - a.t.getTime())
            .slice(0, 12)
            .map((row, i) => (
              <li key={i} className="flex items-baseline gap-4 py-2 border-b border-border last:border-b-0">
                <span className="text-body text-text min-w-0 flex-1">{row.text}</span>
                <span className="text-small text-text-subtle shrink-0 tabular-nums">
                  {formatEventDateTime(row.t, event.timezone, locale)}
                </span>
              </li>
            ))}
          {recentResponses.length === 0 && recentMessages.length === 0 ? (
            <li className="text-body text-text-muted py-2">No activity yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
