"use client";

import * as React from "react";
import { Button } from "@/ui/Button";
import { EditEventSheet, type EditEventInitial } from "./EditEventSheet";

export function WorkspaceHeaderActions({
  eventId,
  initial,
}: {
  eventId: string;
  initial: EditEventInitial;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Edit</Button>
      <EditEventSheet eventId={eventId} initial={initial} open={open} onOpenChange={setOpen} />
    </>
  );
}
