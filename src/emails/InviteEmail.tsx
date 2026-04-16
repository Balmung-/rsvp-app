import {
  Body,
  Container,
  Hr,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface InviteEmailProps {
  locale: "en" | "ar";
  brandAccent: string;
  orgName: string;
  logoUrl: string | null;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  eventTitle: string;
  eventDateTime: string;
  eventVenue: string;
  rsvpLink: string;
  supportEmail: string | null;
}

export function InviteEmail(props: InviteEmailProps): React.ReactElement {
  const dir = props.locale === "ar" ? "rtl" : "ltr";
  const ctaLabel = props.locale === "ar" ? "تأكيد الحضور" : "Respond";

  return (
    <html lang={props.locale} dir={dir}>
      <head />
      {props.preheader ? <Preview>{props.preheader}</Preview> : null}
      <Body
        style={{
          backgroundColor: "#FBFAF7",
          color: "#0F0F10",
          fontFamily:
            props.locale === "ar"
              ? '"IBM Plex Sans Arabic", "Noto Sans Arabic", system-ui, sans-serif'
              : 'Inter, system-ui, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "24px 16px",
          }}
        >
          <Section style={{ height: 3, backgroundColor: props.brandAccent, borderRadius: 999 }} />

          <Section style={{ padding: "32px 24px 8px" }}>
            <Text style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8A8A8F", margin: "0 0 8px" }}>
              {props.orgName}
            </Text>
            <Text style={{ fontSize: 28, lineHeight: "32px", fontWeight: 500, letterSpacing: "-0.01em", color: "#0F0F10", margin: "0 0 16px" }}>
              {props.eventTitle}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: "24px", color: "#5C5C60", margin: "0 0 4px" }}>
              {props.eventDateTime}
            </Text>
            {props.eventVenue ? (
              <Text style={{ fontSize: 15, lineHeight: "24px", color: "#5C5C60", margin: "0" }}>
                {props.eventVenue}
              </Text>
            ) : null}
          </Section>

          <Section style={{ padding: "16px 24px 24px", fontSize: 15, lineHeight: "24px", color: "#0F0F10" }}>
            <div dangerouslySetInnerHTML={{ __html: props.bodyHtml }} />
          </Section>

          <Section style={{ padding: "0 24px 32px" }}>
            <Link
              href={props.rsvpLink}
              style={{
                display: "inline-block",
                backgroundColor: props.brandAccent,
                color: "#FFFFFF",
                textDecoration: "none",
                padding: "14px 24px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {ctaLabel}
            </Link>
          </Section>

          <Hr style={{ borderColor: "#EAE8E3", margin: "0 24px" }} />

          <Section style={{ padding: "16px 24px 0", fontSize: 12, color: "#8A8A8F", lineHeight: "18px" }}>
            <Text style={{ margin: 0 }}>
              {props.locale === "ar"
                ? "تم إرسال هذه الدعوة عبر بريد إلكتروني معتمد. إذا كان لديك أي استفسار، يرجى التواصل "
                : "This invitation was sent on behalf of the organiser. If you have any questions, contact "}
              {props.supportEmail ? (
                <Link href={`mailto:${props.supportEmail}`} style={{ color: props.brandAccent }}>
                  {props.supportEmail}
                </Link>
              ) : (
                props.orgName
              )}
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </html>
  );
}
