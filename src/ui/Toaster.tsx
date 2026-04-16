"use client";

import * as React from "react";
import * as RT from "@radix-ui/react-toast";
import type { ToastDetail, ToastKind } from "./toast";
import { cn } from "@/lib/cn";

interface Item { id: number; text: string; kind: ToastKind }
let nextId = 1;

const KIND: Record<ToastKind, string> = {
  info: "border-border-strong",
  success: "border-success/40 bg-success/[0.04]",
  error: "border-danger/40 bg-danger/[0.04]",
};

const DOT: Record<ToastKind, string> = {
  info: "bg-text-muted",
  success: "bg-success",
  error: "bg-danger",
};

export function Toaster(): React.ReactElement {
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
    function onToast(e: Event): void {
      const ce = e as CustomEvent<ToastDetail>;
      const item: Item = { id: nextId++, text: ce.detail.text, kind: ce.detail.kind };
      setItems((s) => [...s, item]);
    }
    window.addEventListener("app:toast", onToast as EventListener);
    return () => window.removeEventListener("app:toast", onToast as EventListener);
  }, []);

  return (
    <RT.Provider swipeDirection="right" duration={4500}>
      {items.map((i) => (
        <RT.Root
          key={i.id}
          onOpenChange={(open) => {
            if (!open) setItems((s) => s.filter((x) => x.id !== i.id));
          }}
          className={cn(
            "bg-surface text-text border rounded-md shadow-md px-4 py-3 flex items-start gap-3",
            "data-[state=open]:animate-fade-slide-up",
            "data-[state=closed]:opacity-0 data-[state=closed]:transition-opacity data-[state=closed]:duration-sm",
            KIND[i.kind]
          )}
        >
          <span aria-hidden className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", DOT[i.kind])} />
          <RT.Title className="text-body leading-snug flex-1">{i.text}</RT.Title>
        </RT.Root>
      ))}
      <RT.Viewport className="fixed z-50 bottom-4 end-4 flex flex-col gap-2 max-w-sm w-full pointer-events-auto" />
    </RT.Provider>
  );
}
