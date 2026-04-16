import { prisma } from "@/lib/db";
import { verifyRsvpToken, tokenHashFromToken } from "@/lib/tokens";
import { pickLocale } from "@/lib/i18n";
import { UnsubscribeForm } from "./UnsubscribeForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  const body = verifyRsvpToken(token);

  let locale: "en" | "ar" = "ar";
  let canEmail = false;
  let canSms = false;

  if (body) {
    const tokenHash = tokenHashFromToken(token);
    const invitee = await prisma.invitee.findFirst({
      where: { id: body.i, tokenHash, tokenVersion: body.v },
      include: { guest: true, event: { include: { organization: true } } },
    });
    if (invitee) {
      locale = pickLocale(invitee.guest.preferredLocale, invitee.event.organization.defaultLocale);
      canEmail = !!invitee.guest.email;
      canSms = !!invitee.guest.phoneE164;
    } else {
      return invalid(locale);
    }
  } else {
    return invalid(locale);
  }

  const dir = locale === "ar" ? "rtl" : "ltr";
  const t = locale === "ar"
    ? { title: "إلغاء الاشتراك", desc: "تأكيد إلغاء استلام الرسائل من هذه الجهة." }
    : { title: "Unsubscribe", desc: "Confirm you no longer want to receive messages from this organiser." };

  return (
    <div lang={locale} dir={dir} className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-micro text-text-subtle mb-2">{locale === "ar" ? "تفضيلات الاتصال" : "Contact preferences"}</p>
        <h1 className="text-h2 text-text mb-3">{t.title}</h1>
        <p className="text-body text-text-muted mb-8">{t.desc}</p>
        <UnsubscribeForm token={token} locale={locale} canEmail={canEmail} canSms={canSms} />
      </div>
    </div>
  );
}

function invalid(locale: "en" | "ar"): React.ReactElement {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <div lang={locale} dir={dir} className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-micro text-text-subtle mb-3">{locale === "ar" ? "رابط" : "Link"}</p>
        <h1 className="text-h2 text-text mb-3">{locale === "ar" ? "هذا الرابط لم يعد صالحًا." : "This link is no longer valid."}</h1>
      </div>
    </div>
  );
}
