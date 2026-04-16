"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StatusDot } from "@/ui/StatusDot";
import { Button } from "@/ui/Button";
import { InviteeSheet } from "./InviteeSheet";
import { toast } from "@/ui/toast";

interface Row {
  id: string;
  fullName: string;
  contact: string;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  partySizeLimit: number;
  respondedAt: string | null;
}

export function GuestsList({ eventId, rows }: { eventId: string; rows: Row[] }): React.ReactElement {
  const router = useRouter();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [showSendOptions, setShowSendOptions] = React.useState(false);

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && selected.size < rows.length;

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(): void {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function clear(): void {
    setSelected(new Set());
    setShowSendOptions(false);
    setTagInput("");
  }

  async function bulk(body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/invitees/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    return { ok: res.ok && Boolean(data.ok), data };
  }

  async function bulkSend(channel: "EMAIL" | "SMS"): Promise<void> {
    const ids = [...selected];
    const r = await bulk({ action: "send", inviteeIds: ids, channel });
    if (r.ok) {
      toast(`Queued · ${ids.length} ${channel.toLowerCase()} message${ids.length === 1 ? "" : "s"}`, "success");
      clear();
      router.refresh();
    } else {
      toast((r.data.error as string) ?? "Could not queue.", "error");
    }
  }
  async function bulkTag(): Promise<void> {
    const tag = tagInput.trim();
    if (!tag) return;
    const r = await bulk({ action: "tag", inviteeIds: [...selected], tag });
    if (r.ok) {
      toast(`Tagged · ${(r.data.changed as number) ?? 0} guest${(r.data.changed as number) === 1 ? "" : "s"}`, "success");
      clear();
      router.refresh();
    } else {
      toast("Could not tag.", "error");
    }
  }
  async function bulkRemove(): Promise<void> {
    if (!confirm(`Remove ${selected.size} invitee${selected.size === 1 ? "" : "s"} from this event?`)) return;
    const r = await bulk({ action: "remove", inviteeIds: [...selected] });
    if (r.ok) {
      toast(`Removed · ${(r.data.removed as number) ?? 0}`, "success");
      clear();
      router.refresh();
    } else {
      toast("Could not remove.", "error");
    }
  }

  return (
    <>
      <div className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 pe-4 ps-0 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Contact</th>
              <th className="py-3 px-4 font-medium">RSVP</th>
              <th className="py-3 px-4 font-medium text-end">Party</th>
              <th className="py-3 px-4 font-medium text-end">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSel = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={[
                    "border-t border-border transition-colors duration-sm",
                    isSel ? "bg-accent/5" : "hover:bg-surface-alt",
                  ].join(" ")}
                >
                  <td className="py-3 pe-4 ps-0 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.fullName}`}
                      checked={isSel}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="py-3 px-4 text-text cursor-pointer" onClick={() => setOpenId(r.id)}>{r.fullName}</td>
                  <td className="py-3 px-4 text-text-muted cursor-pointer" onClick={() => setOpenId(r.id)}>{r.contact}</td>
                  <td className="py-3 px-4 cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <span className="inline-flex items-center gap-2 text-text-muted">
                      <StatusDot
                        variant={r.rsvpStatus === "ACCEPTED" ? "success" : r.rsvpStatus === "DECLINED" ? "danger" : "muted"}
                      />
                      {r.rsvpStatus.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted cursor-pointer" onClick={() => setOpenId(r.id)}>{r.partySizeLimit}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-subtle cursor-pointer" onClick={() => setOpenId(r.id)}>
                    {r.respondedAt ? new Date(r.respondedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-text-muted">
                  No guests yet. Use the Import button above to upload a CSV or Excel file.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected.size > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface shadow-lg animate-slide-up"
        >
          <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-small text-text tabular-nums">{selected.size} selected</span>
            <span className="text-text-subtle">·</span>
            {showSendOptions ? (
              <>
                <Button size="sm" onClick={() => bulkSend("EMAIL")} loading={busy}>Send email</Button>
                <Button size="sm" onClick={() => bulkSend("SMS")} loading={busy}>Send SMS</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSendOptions(false)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setShowSendOptions(true)}>Send to selection</Button>
            )}
            <input
              type="text"
              placeholder="Tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="h-8 px-2 text-small rounded border border-border bg-surface w-28"
            />
            <Button size="sm" variant="secondary" onClick={bulkTag} disabled={!tagInput.trim() || busy}>Tag</Button>
            <Button size="sm" variant="danger" onClick={bulkRemove} disabled={busy}>Remove</Button>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
          </div>
        </div>
      ) : null}

      <InviteeSheet
        eventId={eventId}
        inviteeId={openId}
        open={openId !== null}
        onOpenChange={(v) => { if (!v) setOpenId(null); }}
      />
    </>
  );
}
