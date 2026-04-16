"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SideSheet } from "@/ui/SideSheet";
import { Button } from "@/ui/Button";
import { StatusDot } from "@/ui/StatusDot";

interface MessageItem {
  id: string;
  channel: "SMS" | "EMAIL";
  status: string;
  provider: string;
  senderIdentity: string;
  recipientEmail: string | null;
  recipientPhoneE164: string | null;
  renderedSubject: string | null;
  createdAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  lastErrorMessage: string | null;
}

interface InviteeDetail {
  id: string;
  partySizeLimit: number;
  allowPlusOne: boolean;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  respondedAt: string | null;
  tokenVersion: number;
  checkedInAt: string | null;
  checkedInCount: number;
  guest: {
    fullName: string;
    email: string | null;
    phoneE164: string | null;
    preferredLocale: string | null;
  };
  rsvpUrl: string;
  qrDataUrl: string;
  responses: Array<{
    id: string;
    status: "ACCEPTED" | "DECLINED";
    attendeeCount: number;
    note: string | null;
    submittedAt: string;
  }>;
  messages: MessageItem[];
}

export function InviteeSheet({
  eventId,
  inviteeId,
  open,
  onOpenChange,
}: {
  eventId: string;
  inviteeId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): React.ReactElement {
  const router = useRouter();
  const [data, setData] = React.useState<InviteeDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open || !inviteeId) {
      setData(null);
      setCopied(false);
      setConfirmingDelete(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/events/${eventId}/invitees/${inviteeId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok) setData(j.invitee);
        else setError(j.error ?? "Could not load invitee.");
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, inviteeId, eventId]);

  async function copyLink(): Promise<void> {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.rsvpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function rotate(): Promise<void> {
    if (!data) return;
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/invitees/${inviteeId}/rotate-token`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok && data) {
      setData({ ...data, rsvpUrl: `${data.rsvpUrl.split("/r/")[0]}/r/${j.token}`, tokenVersion: j.tokenVersion });
    }
  }

  async function deleteInvitee(): Promise<void> {
    if (!data) return;
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/invitees/${inviteeId}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={data?.guest.fullName ?? "Invitee"}
      size="lg"
    >
      {loading ? (
        <div className="text-body text-text-muted">Loading…</div>
      ) : error ? (
        <p role="alert" className="text-small text-danger">{error}</p>
      ) : !data ? null : (
        <div className="flex flex-col gap-7">
          <section className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-body text-text-muted">
              <StatusDot variant={data.rsvpStatus === "ACCEPTED" ? "success" : data.rsvpStatus === "DECLINED" ? "danger" : "muted"} />
              {data.rsvpStatus.toLowerCase()}
            </span>
            <span className="text-small text-text-subtle">Token v{data.tokenVersion}</span>
          </section>

          <section>
            <h3 className="text-micro text-text-subtle mb-2">Contact</h3>
            <dl className="text-body grid grid-cols-[7rem_1fr] gap-y-1">
              <dt className="text-text-muted">Email</dt><dd>{data.guest.email ?? "—"}</dd>
              <dt className="text-text-muted">Phone</dt><dd className="tabular-nums">{data.guest.phoneE164 ?? "—"}</dd>
              <dt className="text-text-muted">Locale</dt><dd>{data.guest.preferredLocale ?? "—"}</dd>
              <dt className="text-text-muted">Party</dt><dd className="tabular-nums">{data.partySizeLimit}{data.allowPlusOne ? " (+1 allowed)" : ""}</dd>
            </dl>
          </section>

          <section>
            <h3 className="text-micro text-text-subtle mb-2">RSVP link</h3>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={data.rsvpUrl}
                className="flex-1 h-10 px-3 rounded-md border border-border bg-surface-alt text-small font-mono text-text-muted truncate"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button size="sm" variant="secondary" onClick={copyLink}>{copied ? "Copied" : "Copy"}</Button>
              <Button size="sm" variant="ghost" onClick={rotate} disabled={busy}>Rotate</Button>
            </div>
            <p className="text-small text-text-subtle mt-2">Rotating invalidates the current link and bumps the token version.</p>

            <details className="mt-4">
              <summary className="cursor-pointer text-small text-text-muted hover:text-text">Show QR code</summary>
              <div className="mt-3 inline-flex flex-col items-center gap-2 p-4 border border-border rounded-md bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrDataUrl} alt="RSVP QR code" width={240} height={240} className="block" />
                <a
                  href={data.qrDataUrl}
                  download={`rsvp-${data.id}.png`}
                  className="text-small text-text-muted hover:text-text underline decoration-border-strong underline-offset-4"
                >
                  Download
                </a>
              </div>
            </details>
          </section>

          {data.responses.length > 0 ? (
            <section>
              <h3 className="text-micro text-text-subtle mb-2">Response history</h3>
              <ul className="flex flex-col gap-2">
                {data.responses.map((r) => (
                  <li key={r.id} className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between text-small">
                      <span className="inline-flex items-center gap-2 text-text-muted">
                        <StatusDot variant={r.status === "ACCEPTED" ? "success" : "danger"} />
                        {r.status.toLowerCase()} · party {r.attendeeCount}
                      </span>
                      <span className="text-text-subtle tabular-nums">{new Date(r.submittedAt).toLocaleString()}</span>
                    </div>
                    {r.note ? <p className="text-small text-text mt-1">{r.note}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="text-micro text-text-subtle mb-2">Messages ({data.messages.length})</h3>
            {data.messages.length === 0 ? (
              <p className="text-small text-text-muted">No messages sent yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.messages.map((m) => (
                  <li key={m.id} className="border border-border rounded-md p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-small">
                      <span className="text-text">{m.channel.toLowerCase()} · {m.provider}</span>
                      <span className="text-text-muted">{m.status.toLowerCase()}</span>
                    </div>
                    {m.renderedSubject ? <div className="text-small text-text-muted truncate">{m.renderedSubject}</div> : null}
                    <div className="text-small text-text-subtle tabular-nums">{new Date(m.createdAt).toLocaleString()}</div>
                    {m.lastErrorMessage ? <div className="text-small text-danger">{m.lastErrorMessage}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            {confirmingDelete ? (
              <>
                <span className="text-small text-text-muted">Remove from this event?</span>
                <Button size="sm" variant="danger" onClick={deleteInvitee} disabled={busy}>Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>No</Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmingDelete(true)}>Remove invitee</Button>
            )}
          </div>
        </div>
      )}
    </SideSheet>
  );
}
