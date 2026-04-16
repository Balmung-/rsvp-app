"use client";

import * as React from "react";
import { Button } from "@/ui/Button";
import { StatusDot } from "@/ui/StatusDot";
import { toast } from "@/ui/toast";

export interface CheckInRow {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  partySizeLimit: number;
  allowPlusOne: boolean;
  checkedInAt: string | null;
  checkedInCount: number;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function CheckInClient({
  eventId,
  initial,
}: {
  eventId: string;
  initial: CheckInRow[];
}): React.ReactElement {
  const [rows, setRows] = React.useState<CheckInRow[]>(initial);
  const [q, setQ] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const query = normalize(q.trim());
    if (!query) return rows;
    const digits = query.replace(/[^\d]/g, "");
    return rows.filter((r) => {
      const nameMatch = normalize(r.fullName).includes(query);
      const phoneMatch = digits.length >= 3 && r.phone?.replace(/[^\d]/g, "").includes(digits);
      const emailMatch = r.email?.toLowerCase().includes(query.toLowerCase());
      return nameMatch || phoneMatch || emailMatch;
    });
  }, [rows, q]);

  async function checkIn(row: CheckInRow, count: number): Promise<void> {
    setBusyId(row.id);
    const res = await fetch(`/api/events/${eventId}/invitees/${row.id}/check-in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (res.ok && json.ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, checkedInAt: json.checkedInAt, checkedInCount: json.checkedInCount } : r
        )
      );
      toast(`${row.fullName} checked in (${count})`, "success");
    } else {
      toast(json.error ?? "Could not check in.", "error");
    }
  }

  async function undo(row: CheckInRow): Promise<void> {
    setBusyId(row.id);
    const res = await fetch(`/api/events/${eventId}/invitees/${row.id}/check-in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ undo: true }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (res.ok && json.ok) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, checkedInAt: null, checkedInCount: 0 } : r))
      );
      toast(`${row.fullName} undone`, "info");
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 md:px-10 py-4 border-b border-border bg-surface sticky top-0 z-10">
        <input
          autoFocus
          type="search"
          inputMode="search"
          placeholder="Search name, phone, or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full h-12 px-4 rounded-md border border-border bg-surface text-body-lg outline-none focus:border-border-strong focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
      </div>

      <ul className="flex-1 overflow-y-auto px-6 md:px-10 py-4 max-w-3xl mx-auto w-full">
        {filtered.length === 0 ? (
          <li className="py-16 text-center text-text-muted">No matches.</li>
        ) : (
          filtered.map((r) => {
            const isIn = r.checkedInAt !== null;
            const max = r.partySizeLimit + (r.allowPlusOne ? 1 : 0);
            return (
              <li
                key={r.id}
                className={[
                  "border-t border-border py-4 flex items-center gap-4 first:border-t-0",
                  isIn ? "opacity-70" : "",
                ].join(" ")}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-body-lg text-text truncate">{r.fullName}</div>
                  <div className="flex items-center gap-3 text-small text-text-muted mt-0.5">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot
                        variant={
                          r.rsvpStatus === "ACCEPTED" ? "success" : r.rsvpStatus === "DECLINED" ? "danger" : "muted"
                        }
                      />
                      {r.rsvpStatus.toLowerCase()}
                    </span>
                    {r.phone ? <span className="tabular-nums">{r.phone}</span> : null}
                    {isIn ? <span className="text-success">arrived · {r.checkedInCount}</span> : null}
                  </div>
                </div>
                {isIn ? (
                  <Button size="sm" variant="ghost" onClick={() => undo(r)} disabled={busyId === r.id}>Undo</Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {max > 1 ? (
                      Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant={n === 1 ? "primary" : "secondary"}
                          onClick={() => checkIn(r, n)}
                          disabled={busyId === r.id}
                        >
                          {n}
                        </Button>
                      ))
                    ) : (
                      <Button
                        size="md"
                        onClick={() => checkIn(r, 1)}
                        disabled={busyId === r.id}
                        loading={busyId === r.id}
                      >
                        Check in
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
