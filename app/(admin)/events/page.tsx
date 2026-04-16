import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDate } from "@/lib/datetime";
import { Button } from "@/ui/Button";
import { StatusDot } from "@/ui/StatusDot";
import { EmptyState } from "@/ui/EmptyState";

const STATUS_VARIANT = {
  DRAFT: "muted",
  SCHEDULED: "neutral",
  LIVE: "success",
  ARCHIVED: "muted",
} as const;

export default async function EventsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const events = await prisma.event.findMany({
    where: { organizationId: user.organizationId },
    include: {
      _count: { select: { invitees: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const responded = await Promise.all(
    events.map((e) =>
      prisma.invitee.count({ where: { eventId: e.id, rsvpStatus: { not: "PENDING" } } })
    )
  );

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-h2 text-text">Events</h1>
        <Button size="md" asChild>
          <Link href="/events/new">New event</Link>
        </Button>
      </header>

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create your first event to start sending invitations."
          action={
            <Button asChild>
              <Link href="/events/new">New event</Link>
            </Button>
          }
        />
      ) : (
        <div className="border-t border-border">
          <table className="w-full text-body">
            <thead>
              <tr className="text-micro text-text-subtle text-start">
                <th className="py-3 ps-0 pe-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Responded</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={e.id} className="border-t border-border group hover:bg-surface-alt transition-colors duration-sm">
                  <td className="py-3 ps-0 pe-4">
                    <Link href={`/events/${e.id}`} className="text-text group-hover:underline decoration-border-strong">
                      {e.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-text-muted">{formatEventDate(e.startsAt, e.timezone)}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2 text-text-muted">
                      <StatusDot variant={STATUS_VARIANT[e.status]} />
                      {e.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">
                    {responded[i]} / {e._count.invitees}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
