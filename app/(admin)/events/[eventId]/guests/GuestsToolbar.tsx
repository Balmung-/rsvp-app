"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/ui/Button";
import { ImportSheet } from "./ImportSheet";

export function GuestsToolbar({ eventId, total }: { eventId: string; total: number }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-small text-text-muted tabular-nums">
        {total} guest{total === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)}>Import CSV / Excel</Button>
      </div>
      <ImportSheet
        eventId={eventId}
        open={open}
        onOpenChange={setOpen}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
