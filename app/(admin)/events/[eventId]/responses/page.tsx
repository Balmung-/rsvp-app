import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/datetime";
import { StatusDot } from "@/ui/StatusDot";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;

  const [event, accepted, declined, pending, responses] = await Promise.all([
    prisma.event.findFirst({ where: { id: eventId, organizationId: user.organizationId } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "ACCEPTED" } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "DECLINED" } }),
    prisma.invitee.count({ where: { eventId, rsvpStatus: "PENDING" } }),
    prisma.rsvpResponse.findMany({
      where: { invitee: { eventId } },
      include: { invitee: { include: { guest: true } } },
      orderBy: { submittedAt: "desc" },
      take: 200,
    }),
  ]);

  if (!event) return <div />;
  const locale: "en" | "ar" = user.locale === "en" ? "en" : "ar";

  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-3 gap-8 md:gap-14">
        {[
          { label: "Accepted", value: accepted },
          { label: "Declined", value: declined },
          { label: "Pending", value: pending },
        ].map((m) => (
          <div key={m.label}>
            <div className="text-micro text-text-subtle mb-2">{m.label}</div>
            <div className="text-[40px] leading-[44px] font-medium tracking-tight text-text tabular-nums">{m.value}</div>
          </div>
        ))}
      </section>

      <section className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Guest</th>
              <th className="py-3 px-4 font-medium">Response</th>
              <th className="py-3 px-4 font-medium">Party</th>
              <th className="py-3 px-4 font-medium">Note</th>
              <th className="py-3 px-4 font-medium text-end">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                <td className="py-3 ps-0 pe-4 text-text">{r.invitee.guest.fullName}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 text-text-muted">
                    <StatusDot variant={r.status === "ACCEPTED" ? "success" : "danger"} />
                    {r.status.toLowerCase()}
                  </span>
                </td>
                <td className="py-3 px-4 text-text-muted tabular-nums">{r.attendeeCount}</td>
                <td className="py-3 px-4 text-text-muted max-w-md truncate">{r.note ?? ""}</td>
                <td className="py-3 px-4 text-end tabular-nums text-text-subtle">
                  {formatEventDateTime(r.submittedAt, event.timezone, locale)}
                </td>
              </tr>
            ))}
            {responses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-text-muted">
                  No responses yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
