import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyRsvpToken, tokenHashFromToken } from "@/lib/tokens";
import { formatEventDateTime, tzAbbrev } from "@/lib/datetime";
import { RsvpFlow } from "./RsvpFlow";
import { LocaleToggle } from "@/ui/LocaleToggle";
import { pickLocale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function RsvpPage({ params }: PageProps): Promise<React.ReactElement> {
  const { token } = await params;
  const body = verifyRsvpToken(token);
  if (!body) return <InvalidLinkPage />;

  const tokenHash = tokenHashFromToken(token);
  const invitee = await prisma.invitee.findFirst({
    where: { id: body.i, tokenHash, tokenVersion: body.v },
    include: {
      guest: true,
      event: { include: { organization: true } },
      rsvpResponses: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });
  if (!invitee) return <InvalidLinkPage />;

  const locale = pickLocale(invitee.guest.preferredLocale, invitee.event.organization.defaultLocale);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const accent = invitee.event.organization.brandAccent;
  const now = new Date();
  const deadlinePassed = invitee.event.rsvpDeadline ? invitee.event.rsvpDeadline.getTime() < now.getTime() : false;

  const heroStyle: React.CSSProperties = invitee.event.heroImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(251,250,247,0.72), rgba(251,250,247,0.94)), url(${invitee.event.heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div
      lang={locale}
      dir={dir}
      className="min-h-screen flex flex-col"
      style={{ ...heroStyle, ["--accent" as unknown as string]: accent } as React.CSSProperties}
    >
      <div
        className="h-[3px] w-full"
        style={{ backgroundColor: accent, opacity: 0.9 }}
        aria-hidden
      />

      <main className="flex-1 flex items-start md:items-center">
        <div className="w-full max-w-[520px] mx-auto px-6 py-10 md:py-16">
          <p className="text-micro text-text-subtle mb-3 animate-fade-in">
            {locale === "ar" ? "لقد تلقيتم دعوة" : "You're invited"}
          </p>
          {invitee.guest.firstName ? (
            <p className="text-body text-text-muted mb-3 animate-fade-in">
              {locale === "ar"
                ? `عزيزي ${invitee.guest.firstName}،`
                : `Dear ${invitee.guest.firstName},`}
            </p>
          ) : null}
          <h1
            className="text-[36px] md:text-[44px] leading-[40px] md:leading-[48px] font-medium tracking-tight text-text mb-5 animate-reveal"
          >
            {invitee.event.title}
          </h1>
          <p className="text-body-lg text-text-muted mb-1 animate-fade-in">
            {formatEventDateTime(invitee.event.startsAt, invitee.event.timezone, locale)}
          </p>
          <p className="text-body-lg text-text-muted mb-1 animate-fade-in">
            {invitee.event.timezone} ({tzAbbrev(invitee.event.timezone, invitee.event.startsAt)})
          </p>
          {invitee.event.venueName ? (
            <p className="text-body text-text-muted mt-3 animate-fade-in">{invitee.event.venueName}</p>
          ) : null}
          {invitee.event.venueAddress ? (
            <p className="text-small text-text-subtle mt-1 animate-fade-in">{invitee.event.venueAddress}</p>
          ) : null}

          <div className="mt-10">
            <RsvpFlow
              token={token}
              locale={locale}
              accent={accent}
              allowPlusOne={invitee.allowPlusOne}
              partySizeLimit={invitee.partySizeLimit}
              currentStatus={invitee.rsvpStatus}
              currentAttendeeCount={invitee.rsvpResponses[0]?.attendeeCount ?? 1}
              currentNote={invitee.rsvpResponses[0]?.note ?? ""}
              deadlinePassed={deadlinePassed}
              event={{
                id: invitee.event.id,
                title: invitee.event.title,
                startsAt: invitee.event.startsAt.toISOString(),
                endsAt: invitee.event.endsAt?.toISOString() ?? null,
                venueName: invitee.event.venueName,
                venueAddress: invitee.event.venueAddress,
                mapUrl: invitee.event.mapUrl,
                timezone: invitee.event.timezone,
              }}
            />
          </div>

          <div className="mt-16 flex items-center justify-between text-small text-text-subtle">
            {invitee.event.organization.logoUrl ? (
              <img
                src={invitee.event.organization.logoUrl}
                alt={invitee.event.organization.name}
                className="h-6 w-auto opacity-90"
              />
            ) : (
              <span>{invitee.event.organization.name}</span>
            )}
            <LocaleToggle />
          </div>
        </div>
      </main>
    </div>
  );
}

function InvalidLinkPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-micro text-text-subtle mb-3">Invitation</p>
        <h1 className="text-h2 text-text mb-3">This link is no longer valid.</h1>
        <p className="text-body text-text-muted">
          Please contact the organiser if you need a fresh invitation link.
        </p>
      </div>
    </div>
  );
}
