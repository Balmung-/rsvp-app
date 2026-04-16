"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/Button";

export function ResponsesActions({
  eventId,
  pendingCount,
}: {
  eventId: string;
  pendingCount: number;
}): React.ReactElement {
  const router = useRouter();
  const [channel, setChannel] = React.useState<"EMAIL" | "SMS">("EMAIL");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function resend(): Promise<void> {
    if (pendingCount === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/quick-campaign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, rsvpStatus: ["PENDING"] }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage(`Queued. ${pendingCount} pending invitee${pendingCount === 1 ? "" : "s"} will be notified.`);
        router.refresh();
      } else {
        setMessage(json.error ?? "Could not queue campaign.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-small text-text-subtle">Nudge non-responders</h2>
      <div className="flex items-center gap-3">
        <div className="inline-flex items-stretch border border-border rounded-md overflow-hidden bg-surface">
          {(["EMAIL", "SMS"] as const).map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              aria-pressed={channel === c}
              className={[
                "h-9 px-3 text-small transition-colors duration-sm",
                i > 0 ? "border-s border-border" : "",
                channel === c ? "bg-surface-alt text-text" : "text-text-muted hover:text-text",
              ].join(" ")}
            >
              {c === "EMAIL" ? "Email" : "SMS"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={resend} disabled={busy || pendingCount === 0}>
          {busy ? "Queueing…" : `Resend to ${pendingCount} pending`}
        </Button>
      </div>
      {message ? <p className="text-small text-text-muted">{message}</p> : null}
    </section>
  );
}
