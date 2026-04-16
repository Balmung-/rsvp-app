"use client";

import * as React from "react";
import { StatusDot } from "@/ui/StatusDot";
import { InviteeSheet } from "./InviteeSheet";

interface Row {
  id: string;
  fullName: string;
  contact: string;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  partySizeLimit: number;
  respondedAt: string | null;
}

export function GuestsList({ eventId, rows }: { eventId: string; rows: Row[] }): React.ReactElement {
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <>
      <div className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Contact</th>
              <th className="py-3 px-4 font-medium">RSVP</th>
              <th className="py-3 px-4 font-medium text-end">Party</th>
              <th className="py-3 px-4 font-medium text-end">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="border-t border-border hover:bg-surface-alt transition-colors duration-sm cursor-pointer"
              >
                <td className="py-3 ps-0 pe-4 text-text">{r.fullName}</td>
                <td className="py-3 px-4 text-text-muted">{r.contact}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 text-text-muted">
                    <StatusDot
                      variant={
                        r.rsvpStatus === "ACCEPTED" ? "success" : r.rsvpStatus === "DECLINED" ? "danger" : "muted"
                      }
                    />
                    {r.rsvpStatus.toLowerCase()}
                  </span>
                </td>
                <td className="py-3 px-4 text-end tabular-nums text-text-muted">{r.partySizeLimit}</td>
                <td className="py-3 px-4 text-end tabular-nums text-text-subtle">
                  {r.respondedAt ? new Date(r.respondedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-text-muted">
                  No guests yet. Use the Import button above to upload a CSV or Excel file.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <InviteeSheet
        eventId={eventId}
        inviteeId={openId}
        open={openId !== null}
        onOpenChange={(v) => { if (!v) setOpenId(null); }}
      />
    </>
  );
}
