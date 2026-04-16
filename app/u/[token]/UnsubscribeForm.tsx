"use client";

import * as React from "react";
import { Button } from "@/ui/Button";

export function UnsubscribeForm({
  token,
  locale,
  canEmail,
  canSms,
}: {
  token: string;
  locale: "en" | "ar";
  canEmail: boolean;
  canSms: boolean;
}): React.ReactElement {
  const t = locale === "ar"
    ? {
        all: "إلغاء جميع المراسلات",
        email: "إلغاء البريد الإلكتروني فقط",
        sms: "إلغاء الرسائل النصية فقط",
        done: "تم تسجيل طلب إلغاء الاشتراك. لن تتلقى مزيدًا من الرسائل.",
        err: "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى.",
      }
    : {
        all: "Unsubscribe from all messages",
        email: "Unsubscribe email only",
        sms: "Unsubscribe SMS only",
        done: "You're unsubscribed. You will not receive further messages.",
        err: "Could not complete the request. Please try again.",
      };

  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function go(channel?: "EMAIL" | "SMS"): Promise<void> {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, channel }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setErr(t.err);
  }

  if (done) {
    return <p className="text-body text-text">{t.done}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {canEmail && canSms ? (
        <>
          <Button size="lg" onClick={() => go()} loading={busy}>{t.all}</Button>
          <Button size="md" variant="secondary" onClick={() => go("EMAIL")} disabled={busy}>{t.email}</Button>
          <Button size="md" variant="secondary" onClick={() => go("SMS")} disabled={busy}>{t.sms}</Button>
        </>
      ) : (
        <Button size="lg" onClick={() => go()} loading={busy}>{t.all}</Button>
      )}
      {err ? <p role="alert" className="text-small text-danger">{err}</p> : null}
    </div>
  );
}
