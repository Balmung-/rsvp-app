import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/datetime";
import { StatusDot } from "@/ui/StatusDot";

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;
  const invitees = await prisma.invitee.findMany({
    where: { eventId, event: { organizationId: user.organizationId } },
    include: { guest: true },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  const locale: "en" | "ar" = user.locale === "en" ? "en" : "ar";

  return (
    <div>
      <div className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Contact</th>
              <th className="py-3 px-4 font-medium">RSVP</th>
              <th className="py-3 px-4 font-medium text-end">Party</th>
              <th className="py-3 px-4 font-medium text-end">Updated</th>
            </tr>
          </thead>
          <tbody>
            {invitees.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                <td className="py-3 ps-0 pe-4 text-text">{i.guest.fullName}</td>
                <td className="py-3 px-4 text-text-muted">
                  {i.guest.email ?? i.guest.phoneE164 ?? "—"}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 text-text-muted">
                    <StatusDot
                      variant={
                        i.rsvpStatus === "ACCEPTED"
                          ? "success"
                          : i.rsvpStatus === "DECLINED"
                          ? "danger"
                          : "muted"
                      }
                    />
                    {i.rsvpStatus.toLowerCase()}
                  </span>
                </td>
                <td className="py-3 px-4 text-end tabular-nums text-text-muted">{i.partySizeLimit}</td>
                <td className="py-3 px-4 text-end tabular-nums text-text-subtle">
                  {i.respondedAt ? formatEventDateTime(i.respondedAt, "Asia/Riyadh", locale) : "—"}
                </td>
              </tr>
            ))}
            {invitees.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-text-muted">
                  No guests yet. Import a CSV to add invitees.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
