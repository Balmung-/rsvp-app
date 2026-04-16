"use client";

import * as React from "react";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";

export function TestSend({
  eventId,
  templateId,
  channel,
}: {
  eventId: string;
  templateId: string;
  channel: "SMS" | "EMAIL";
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function send(): Promise<void> {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/test-send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateId, to }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      setMsg(`Sent to ${to}.`);
      setTo("");
    } else {
      setMsg(json.error ?? "Test send failed.");
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="md" onClick={() => setOpen(true)} disabled={!templateId}>
        Send test
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        type={channel === "EMAIL" ? "email" : "tel"}
        placeholder={channel === "EMAIL" ? "you@example.com" : "+9665XXXXXXXX"}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-64"
      />
      <Button size="md" onClick={send} loading={busy} disabled={!to || !templateId}>Send test</Button>
      <Button size="md" variant="ghost" onClick={() => { setOpen(false); setMsg(null); }}>Cancel</Button>
      {msg ? <span className="text-small text-text-muted">{msg}</span> : null}
    </div>
  );
}
