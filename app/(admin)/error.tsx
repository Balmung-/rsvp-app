"use client";

import * as React from "react";
import { Button } from "@/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  React.useEffect(() => {
    // Surface to the console so it isn't swallowed by Next's overlay in prod.
    console.error("[admin.error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <p className="text-micro text-text-subtle mb-2">Error</p>
        <h1 className="text-h2 text-text mb-3">Something went wrong rendering this page.</h1>
        <p className="text-body text-text-muted mb-6">
          The error is logged to the browser console. You can retry, or go back to the events list.
        </p>
        <pre className="text-small font-mono text-text-muted bg-surface-alt border border-border rounded-md p-4 overflow-auto max-h-64 whitespace-pre-wrap break-words">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <div className="flex items-center gap-3 mt-6">
          <Button onClick={reset}>Try again</Button>
          <a href="/events" className="text-small text-text-muted hover:text-text underline decoration-border-strong underline-offset-4">Go to events</a>
        </div>
      </div>
    </div>
  );
}
