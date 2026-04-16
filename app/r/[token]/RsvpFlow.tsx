"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { Textarea, Label } from "@/ui/Input";
import { cn } from "@/lib/cn";

type View = "decision" | "accept-details" | "decline-note" | "thanks-accepted" | "thanks-declined" | "closed";

interface EventLite {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  venueAddress: string | null;
  mapUrl: string | null;
  timezone: string;
}

interface Props {
  token: string;
  locale: "en" | "ar";
  accent: string;
  allowPlusOne: boolean;
  partySizeLimit: number;
  currentStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  currentAttendeeCount: number;
  currentNote: string;
  deadlinePassed: boolean;
  event: EventLite;
}

export function RsvpFlow(props: Props): React.ReactElement {
  const initial: View = props.deadlinePassed
    ? "closed"
    : props.currentStatus === "ACCEPTED"
    ? "thanks-accepted"
    : props.currentStatus === "DECLINED"
    ? "thanks-declined"
    : "decision";

  const [view, setView] = useState<View>(initial);
  const [attendeeCount, setAttendeeCount] = useState<number>(props.currentAttendeeCount);
  const [note, setNote] = useState<string>(props.currentNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const t = useT(props.locale);
  const accentVar = { backgroundColor: props.accent } as React.CSSProperties;

  async function submit(status: "ACCEPTED" | "DECLINED"): Promise<void> {
    setError(null);
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: props.token,
        status,
        attendeeCount: status === "ACCEPTED" ? attendeeCount : 1,
        note: note || undefined,
        locale: props.locale,
      }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) {
      startTransition(() => {
        setView(status === "ACCEPTED" ? "thanks-accepted" : "thanks-declined");
      });
      return;
    }
    if (res.status === 410) {
      setError(t("linkInvalidShort"));
      return;
    }
    if (res.status === 409) {
      setView("closed");
      return;
    }
    setError(json?.error ?? t("errorGeneric"));
  }

  if (view === "closed") {
    return (
      <div className="animate-fade-in">
        <p className="text-body text-text-muted">{t("rsvpClosed")}</p>
        <Extras event={props.event} locale={props.locale} className="mt-6" />
      </div>
    );
  }

  if (view === "thanks-accepted") {
    return (
      <div className="animate-fade-slide-up">
        <p className="text-h3 text-text mb-1">{t("thanksAccepted")}</p>
        <p className="text-body text-text-muted">
          {new Date(props.event.startsAt).toLocaleDateString(props.locale === "ar" ? "ar-SA" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: props.event.timezone,
          })}
        </p>
        <Extras event={props.event} locale={props.locale} className="mt-6" />
        {!props.deadlinePassed ? (
          <button
            type="button"
            onClick={() => setView("decision")}
            className="mt-6 text-small text-text-muted hover:text-text underline decoration-border-strong underline-offset-4"
          >
            {t("editResponse")}
          </button>
        ) : null}
      </div>
    );
  }

  if (view === "thanks-declined") {
    return (
      <div className="animate-fade-slide-up">
        <p className="text-h3 text-text mb-1">{t("thanksDeclined")}</p>
        {!props.deadlinePassed ? (
          <button
            type="button"
            onClick={() => setView("decision")}
            className="mt-6 text-small text-text-muted hover:text-text underline decoration-border-strong underline-offset-4"
          >
            {t("editResponse")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid gap-3 md:grid-cols-2 transition-[opacity] duration-sm"
        style={{ opacity: view === "decision" ? 1 : 0.4 }}
      >
        <DecisionButton
          label={t("accept")}
          onClick={() => setView("accept-details")}
          primary
          active={view === "accept-details"}
          accentStyle={accentVar}
        />
        <DecisionButton
          label={t("decline")}
          onClick={() => setView("decline-note")}
          primary={false}
          active={view === "decline-note"}
          accentStyle={accentVar}
        />
      </div>

      <GridReveal open={view === "accept-details"}>
        <div className="pt-6 flex flex-col gap-5">
          {props.partySizeLimit > 1 ? (
            <div>
              <Label>{t("attendeeCount")}</Label>
              <Stepper
                value={attendeeCount}
                min={1}
                max={props.partySizeLimit + (props.allowPlusOne ? 1 : 0)}
                onChange={setAttendeeCount}
                locale={props.locale}
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="note">
              {t("note")} <span className="text-text-subtle">({t("optional")})</span>
            </Label>
            <Textarea
              id="note"
              maxLength={600}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={props.locale === "ar" ? "متطلبات غذائية، أو أي ملاحظة" : "Dietary needs, anything else"}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={() => submit("ACCEPTED")} loading={pending} style={{ backgroundColor: props.accent }}>
              {t("confirm")}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setView("decision")} disabled={pending}>
              {t("back")}
            </Button>
          </div>
        </div>
      </GridReveal>

      <GridReveal open={view === "decline-note"}>
        <div className="pt-6 flex flex-col gap-5">
          <div>
            <Label htmlFor="declineNote">
              {t("noteDecline")} <span className="text-text-subtle">({t("optional")})</span>
            </Label>
            <Textarea
              id="declineNote"
              maxLength={600}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={() => submit("DECLINED")} loading={pending} style={{ backgroundColor: props.accent }}>
              {t("confirm")}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setView("decision")} disabled={pending}>
              {t("back")}
            </Button>
          </div>
        </div>
      </GridReveal>

      {error ? <p role="alert" className="mt-4 text-small text-danger">{error}</p> : null}
    </div>
  );
}

function DecisionButton({
  label,
  onClick,
  primary,
  active,
  accentStyle,
}: {
  label: string;
  onClick: () => void;
  primary: boolean;
  active: boolean;
  accentStyle: React.CSSProperties;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-14 rounded-md text-body-lg font-medium transition-[background,filter,transform,opacity] duration-sm ease-std select-none",
        "active:scale-[0.98] active:duration-xs",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        primary
          ? "text-accent-ink hover:brightness-95"
          : "bg-transparent text-text border border-border-strong hover:bg-surface-alt",
        active && !primary ? "bg-surface-alt" : ""
      )}
      style={primary ? { ...accentStyle, outlineColor: "var(--accent)" } : { outlineColor: "var(--accent)" }}
    >
      {label}
    </button>
  );
}

function GridReveal({ open, children }: { open: boolean; children: React.ReactNode }): React.ReactElement {
  return (
    <div
      aria-hidden={!open}
      className="grid transition-[grid-template-rows,opacity] duration-md ease-std"
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  locale,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  locale: "en" | "ar";
}): React.ReactElement {
  return (
    <div className="inline-flex items-center gap-0 border border-border rounded-md overflow-hidden bg-surface">
      <StepBtn disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={locale === "ar" ? "تقليل" : "Decrease"}>−</StepBtn>
      <div className="w-12 text-center text-body text-text tabular-nums border-x border-border">{value}</div>
      <StepBtn disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={locale === "ar" ? "زيادة" : "Increase"}>+</StepBtn>
    </div>
  );
}

function StepBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement {
  return (
    <button
      type="button"
      {...rest}
      className="h-10 w-10 text-body text-text-muted hover:text-text hover:bg-surface-alt disabled:opacity-40 disabled:pointer-events-none transition-colors duration-sm"
    >
      {children}
    </button>
  );
}

function Extras({ event, locale, className }: { event: EventLite; locale: "en" | "ar"; className?: string }): React.ReactElement {
  const t = useT(locale);
  const icsHref = useIcsHref(event);
  return (
    <div className={cn("flex items-center gap-5 text-small", className)}>
      <a
        href={icsHref}
        download={`${event.id}.ics`}
        className="text-text-muted hover:text-text underline decoration-border-strong underline-offset-4"
      >
        {t("addToCalendar")}
      </a>
      {event.mapUrl ? (
        <a
          href={event.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="text-text-muted hover:text-text underline decoration-border-strong underline-offset-4"
        >
          {t("openMap")}
        </a>
      ) : null}
    </div>
  );
}

function useIcsHref(event: EventLite): string {
  const dt = (iso: string): string => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endIso = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ministry of Media//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@ministry-of-media.sa`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(event.startsAt)}`,
    `DTEND:${dt(endIso)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.venueName ? `LOCATION:${escapeIcs([event.venueName, event.venueAddress].filter(Boolean).join(", "))}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

type Key =
  | "accept"
  | "decline"
  | "attendeeCount"
  | "note"
  | "noteDecline"
  | "optional"
  | "confirm"
  | "back"
  | "thanksAccepted"
  | "thanksDeclined"
  | "addToCalendar"
  | "openMap"
  | "editResponse"
  | "rsvpClosed"
  | "linkInvalidShort"
  | "errorGeneric";

function useT(locale: "en" | "ar"): (key: Key) => string {
  const dict: Record<"en" | "ar", Record<Key, string>> = {
    en: {
      accept: "Accept",
      decline: "Decline",
      attendeeCount: "Attendees",
      note: "Note",
      noteDecline: "Anything you'd like to say?",
      optional: "optional",
      confirm: "Confirm",
      back: "Back",
      thanksAccepted: "You're confirmed.",
      thanksDeclined: "Thank you for letting us know.",
      addToCalendar: "Add to calendar",
      openMap: "Open map",
      editResponse: "Edit response",
      rsvpClosed: "RSVP closed.",
      linkInvalidShort: "This link is no longer valid.",
      errorGeneric: "Something went wrong. Please try again.",
    },
    ar: {
      accept: "سأحضر",
      decline: "اعتذار",
      attendeeCount: "عدد الحضور",
      note: "ملاحظة",
      noteDecline: "أي كلمة تودّ إضافتها؟",
      optional: "اختياري",
      confirm: "تأكيد",
      back: "رجوع",
      thanksAccepted: "تم تأكيد حضوركم.",
      thanksDeclined: "نشكركم على إبلاغنا.",
      addToCalendar: "إضافة إلى التقويم",
      openMap: "الخريطة",
      editResponse: "تعديل الرد",
      rsvpClosed: "تم إغلاق باب الرد.",
      linkInvalidShort: "لم يعد هذا الرابط صالحًا.",
      errorGeneric: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    },
  };
  return (key: Key): string => dict[locale][key];
}
