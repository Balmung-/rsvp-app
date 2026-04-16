"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function FileDrop({
  accept,
  onFile,
  className,
  label,
  hint,
}: {
  accept: string;
  onFile: (file: File) => void;
  className?: string;
  label: string;
  hint?: string;
}): React.ReactElement {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group cursor-pointer select-none rounded-lg border border-dashed px-6 py-10 text-center",
        "transition-colors duration-sm ease-std",
        dragOver ? "border-accent bg-accent/5" : "border-border-strong hover:border-accent/60 hover:bg-surface-alt",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <p className="text-body text-text">{label}</p>
      {hint ? <p className="mt-1 text-small text-text-subtle">{hint}</p> : null}
    </div>
  );
}
