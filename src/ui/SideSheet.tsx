"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

export function SideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "end",
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  side?: "start" | "end";
  size?: "sm" | "md" | "lg";
}): React.ReactElement {
  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";
  const sideCls =
    side === "end"
      ? "inset-y-0 end-0 border-s border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
      : "inset-y-0 start-0 border-e border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/20 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed z-50 w-full bg-surface shadow-lg flex flex-col",
            "duration-md ease-std",
            width,
            sideCls
          )}
        >
          <header className="flex items-start justify-between gap-6 px-6 pt-5 pb-4 border-b border-border">
            <div className="min-w-0">
              <Dialog.Title className="text-h3 text-text truncate">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-small text-text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="shrink-0 -mt-1 -me-1 h-8 w-8 inline-flex items-center justify-center rounded hover:bg-surface-alt text-text-muted"
            >
              <span aria-hidden className="text-[18px] leading-none">×</span>
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
