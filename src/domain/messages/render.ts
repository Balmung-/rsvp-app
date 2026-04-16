import { render as renderReactEmail } from "@react-email/render";
import type { Event, Guest, Invitee, Organization, Template } from "@prisma/client";
import { InviteEmail } from "@/emails/InviteEmail";
import { formatEventDateTime } from "@/lib/datetime";

export interface RenderContext {
  org: Organization;
  event: Event;
  guest: Guest;
  invitee: Invitee;
  rsvpLink: string;
  locale: "en" | "ar";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

function substitute(template: string, vars: Record<string, string>, escape: boolean): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9._]+)\s*\}\}/g, (_, key: string) => {
    const val = vars[key];
    if (val == null) return "";
    return escape ? escapeHtml(val) : val;
  });
}

export function buildVars(ctx: RenderContext): Record<string, string> {
  return {
    "guest.firstName": ctx.guest.firstName ?? "",
    "guest.fullName": ctx.guest.fullName,
    "event.title": ctx.event.title,
    "event.startsAt": formatEventDateTime(ctx.event.startsAt, ctx.event.timezone, ctx.locale),
    "event.venueName": ctx.event.venueName ?? "",
    "event.venueAddress": ctx.event.venueAddress ?? "",
    "rsvp.link": ctx.rsvpLink,
    "rsvp.deadline": ctx.event.rsvpDeadline
      ? formatEventDateTime(ctx.event.rsvpDeadline, ctx.event.timezone, ctx.locale)
      : "",
    "org.name": ctx.org.name,
    "org.supportEmail": ctx.org.supportEmail ?? "",
    "org.supportPhone": ctx.org.supportPhone ?? "",
  };
}

export interface RenderedSms {
  body: string;
  warnings: string[];
}

export function renderSms(template: Template, ctx: RenderContext): RenderedSms {
  const vars = buildVars(ctx);
  const body = substitute(template.smsBody ?? "", vars, false).trim();
  const warnings: string[] = [];
  const hasUnicode = /[^\u0000-\u007F]/.test(body);
  const limit = hasUnicode ? 70 : 160;
  if (body.length > limit) {
    warnings.push(`SMS body (${body.length} chars) exceeds single-segment limit of ${limit} for ${hasUnicode ? "UCS-2" : "GSM-7"}.`);
  }
  return { body, warnings };
}

export interface RenderedEmail {
  subject: string;
  preheader: string | null;
  html: string;
  text: string;
}

export async function renderEmail(template: Template, ctx: RenderContext): Promise<RenderedEmail> {
  const vars = buildVars(ctx);
  const subject = substitute(template.subject ?? "", vars, false);
  const preheader = template.preheader ? substitute(template.preheader, vars, false) : null;
  const body = substitute(template.bodyMarkdown ?? "", vars, true);

  const html = await renderReactEmail(
    InviteEmail({
      locale: ctx.locale,
      brandAccent: ctx.org.brandAccent,
      orgName: ctx.org.name,
      logoUrl: ctx.org.logoUrl ?? null,
      subject,
      preheader,
      bodyHtml: body,
      eventTitle: ctx.event.title,
      eventDateTime: vars["event.startsAt"] ?? "",
      eventVenue: ctx.event.venueName ?? "",
      rsvpLink: ctx.rsvpLink,
      supportEmail: ctx.org.supportEmail ?? null,
    })
  );

  const text = await renderReactEmail(
    InviteEmail({
      locale: ctx.locale,
      brandAccent: ctx.org.brandAccent,
      orgName: ctx.org.name,
      logoUrl: null,
      subject,
      preheader,
      bodyHtml: body,
      eventTitle: ctx.event.title,
      eventDateTime: vars["event.startsAt"] ?? "",
      eventVenue: ctx.event.venueName ?? "",
      rsvpLink: ctx.rsvpLink,
      supportEmail: ctx.org.supportEmail ?? null,
    }),
    { plainText: true }
  );

  return { subject, preheader, html, text };
}
