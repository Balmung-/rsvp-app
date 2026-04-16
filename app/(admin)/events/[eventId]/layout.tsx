import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatEventDateTime, tzAbbrev } from "@/lib/datetime";
import { SegmentedNav } from "@/ui/SegmentedNav";
import { StatusDot } from "@/ui/StatusDot";
import { WorkspaceHeaderActions } from "./WorkspaceHeader";

export default async function EventWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
    include: { organization: true },
  });
  if (!event) notFound();

  const locale: "en" | "ar" = (user.locale === "en" ? "en" : "ar");

  return (
    <div>
      <div className="mb-6">
        <div
          className="h-[3px] w-16 rounded-full mb-5"
          style={{ backgroundColor: event.organization.brandAccent }}
        />
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-h2 text-text mb-2">{event.title}</h1>
          <WorkspaceHeaderActions
            eventId={event.id}
            initial={{
              title: event.title,
              slug: event.slug,
              description: event.description,
              venueName: event.venueName,
              venueAddress: event.venueAddress,
              mapUrl: event.mapUrl,
              startsAt: event.startsAt.toISOString(),
              endsAt: event.endsAt?.toISOString() ?? null,
              timezone: event.timezone,
              rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
              dressCode: event.dressCode,
              heroImageUrl: event.heroImageUrl,
              status: event.status,
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-text-muted">
          <span>{formatEventDateTime(event.startsAt, event.timezone, locale)}</span>
          <span aria-hidden>·</span>
          <span>
            {event.timezone} ({tzAbbrev(event.timezone, event.startsAt)})
          </span>
          {event.rsvpDeadline ? (
            <>
              <span aria-hidden>·</span>
              <span>Deadline {formatEventDateTime(event.rsvpDeadline, event.timezone, locale)}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-2">
            <StatusDot variant={event.status === "LIVE" ? "success" : "muted"} />
            {event.status.toLowerCase()}
          </span>
        </div>
      </div>

      <SegmentedNav
        items={[
          { href: `/events/${event.id}`, label: "Overview", exact: true },
          { href: `/events/${event.id}/guests`, label: "Guests" },
          { href: `/events/${event.id}/compose`, label: "Compose" },
          { href: `/events/${event.id}/delivery`, label: "Delivery" },
          { href: `/events/${event.id}/responses`, label: "Responses" },
        ]}
      />

      <div className="mt-8">{children}</div>
    </div>
  );
}
