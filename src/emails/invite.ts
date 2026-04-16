// Plain HTML email template. No React, no @react-email/* — keeps this file
// out of any Next.js build graph scans that flag JSX <Html>/<Head> elements.

export interface InviteRenderInput {
  locale: "en" | "ar";
  brandAccent: string;
  orgName: string;
  logoUrl: string | null;
  subject: string;
  preheader: string | null;
  bodyHtml: string; // already-sanitised / escaped HTML fragment for the body
  eventTitle: string;
  eventDateTime: string;
  eventVenue: string;
  rsvpLink: string;
  unsubscribeLink: string | null;
  supportEmail: string | null;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

function e(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export function renderInvite(input: InviteRenderInput): RenderedEmail {
  const dir = input.locale === "ar" ? "rtl" : "ltr";
  const cta = input.locale === "ar" ? "تأكيد الحضور" : "Respond";
  const fontFamily =
    input.locale === "ar"
      ? '"IBM Plex Sans Arabic", "Noto Sans Arabic", system-ui, sans-serif'
      : "Inter, system-ui, sans-serif";

  const footerPre =
    input.locale === "ar"
      ? "تم إرسال هذه الدعوة عبر بريد إلكتروني معتمد. إذا كان لديك أي استفسار، يرجى التواصل "
      : "This invitation was sent on behalf of the organiser. If you have any questions, contact ";

  const support = input.supportEmail
    ? `<a href="mailto:${e(input.supportEmail)}" style="color:${e(input.brandAccent)};text-decoration:underline">${e(input.supportEmail)}</a>`
    : e(input.orgName);

  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px">${e(input.preheader)}</div>`
    : "";

  const venue = input.eventVenue
    ? `<p style="margin:0;font-size:15px;line-height:24px;color:#5C5C60">${e(input.eventVenue)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="${e(input.locale)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FBFAF7;color:#0F0F10;font-family:${fontFamily}">
${preheader}
<div role="article" aria-roledescription="email" aria-label="${e(input.subject)}" style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="height:3px;background:${e(input.brandAccent)};border-radius:999px"></div>

  <div style="padding:32px 24px 8px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#8A8A8F">${e(input.orgName)}</p>
    <h1 style="margin:0 0 16px;font-size:28px;line-height:32px;font-weight:500;letter-spacing:-0.01em;color:#0F0F10">${e(input.eventTitle)}</h1>
    <p style="margin:0 0 4px;font-size:15px;line-height:24px;color:#5C5C60">${e(input.eventDateTime)}</p>
    ${venue}
  </div>

  <div style="padding:16px 24px 24px;font-size:15px;line-height:24px;color:#0F0F10">
    ${input.bodyHtml}
  </div>

  <div style="padding:0 24px 32px">
    <a href="${e(input.rsvpLink)}" style="display:inline-block;background:${e(input.brandAccent)};color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:500">${e(cta)}</a>
  </div>

  <hr style="border:none;border-top:1px solid #EAE8E3;margin:0 24px">

  <div style="padding:16px 24px 0;font-size:12px;color:#8A8A8F;line-height:18px">
    <p style="margin:0 0 6px">${e(footerPre)}${support}.</p>
    ${input.unsubscribeLink ? `<p style="margin:0"><a href="${e(input.unsubscribeLink)}" style="color:#8A8A8F;text-decoration:underline">${input.locale === "ar" ? "إلغاء الاشتراك" : "Unsubscribe"}</a></p>` : ""}
  </div>
</div>
</body>
</html>`;

  const stripTags = (s: string): string => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const text = [
    input.orgName,
    "",
    input.eventTitle,
    input.eventDateTime,
    input.eventVenue,
    "",
    stripTags(input.bodyHtml),
    "",
    `${cta}: ${input.rsvpLink}`,
    "",
    input.supportEmail ? `${input.locale === "ar" ? "للاستفسار: " : "Contact: "}${input.supportEmail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}
