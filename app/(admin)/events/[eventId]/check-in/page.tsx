import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CheckInClient, type CheckInRow } from "./CheckInClient";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
  });
  if (!event) notFound();

  const invitees = await prisma.invitee.findMany({
    where: { eventId },
    include: { guest: { select: { fullName: true, phoneE164: true, email: true } } },
    orderBy: { guest: { fullName: "asc" } },
  });

  const rows: CheckInRow[] = invitees.map((i) => ({
    id: i.id,
    fullName: i.guest.fullName,
    phone: i.guest.phoneE164 ?? null,
    email: i.guest.email ?? null,
    rsvpStatus: i.rsvpStatus,
    partySizeLimit: i.partySizeLimit,
    allowPlusOne: i.allowPlusOne,
    checkedInAt: i.checkedInAt?.toISOString() ?? null,
    checkedInCount: i.checkedInCount,
  }));

  const arrived = rows.filter((r) => r.checkedInAt).length;
  const accepted = rows.filter((r) => r.rsvpStatus === "ACCEPTED").length;

  return (
    <div className="-mx-6 md:-mx-10 -my-8 min-h-[calc(100vh-3.5rem)] flex flex-col bg-bg">
      <header className="px-6 md:px-10 py-5 border-b border-border bg-surface flex items-center gap-6">
        <div className="min-w-0">
          <Link href={`/events/${eventId}`} className="text-small text-text-muted hover:text-text">← {event.title}</Link>
          <h1 className="text-h2 text-text mt-1">Check-in</h1>
        </div>
        <div className="flex-1" />
        <div className="flex items-baseline gap-6 text-end">
          <div>
            <div className="text-micro text-text-subtle">Arrived</div>
            <div className="text-[28px] leading-[32px] font-medium tabular-nums text-text">{arrived}</div>
          </div>
          <div>
            <div className="text-micro text-text-subtle">Accepted</div>
            <div className="text-[28px] leading-[32px] font-medium tabular-nums text-text-muted">{accepted}</div>
          </div>
        </div>
      </header>
      <CheckInClient eventId={eventId} initial={rows} />
    </div>
  );
}
