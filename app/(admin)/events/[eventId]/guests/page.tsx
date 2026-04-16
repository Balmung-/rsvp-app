import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GuestsToolbar } from "./GuestsToolbar";
import { GuestsList } from "./GuestsList";

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
    take: 1000,
  });

  const rows = invitees.map((i) => ({
    id: i.id,
    fullName: i.guest.fullName,
    contact: i.guest.email ?? i.guest.phoneE164 ?? "—",
    rsvpStatus: i.rsvpStatus,
    partySizeLimit: i.partySizeLimit,
    respondedAt: i.respondedAt?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <GuestsToolbar eventId={eventId} total={invitees.length} />
      <GuestsList eventId={eventId} rows={rows} />
    </div>
  );
}
