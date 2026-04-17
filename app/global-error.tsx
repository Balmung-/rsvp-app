"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  React.useEffect(() => {
    console.error("[global.error]", error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif", background: "#FBFAF7", color: "#0F0F10" }}>
        <div style={{ maxWidth: 640, margin: "10vh auto", padding: "0 24px" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8A8A8F", margin: "0 0 8px" }}>
            Application error
          </p>
          <h1 style={{ fontSize: 28, lineHeight: "32px", fontWeight: 500, margin: "0 0 16px" }}>
            Something went wrong.
          </h1>
          <p style={{ fontSize: 15, lineHeight: "24px", color: "#5C5C60", margin: "0 0 24px" }}>
            The error is logged to the browser console. Refresh to try again.
          </p>
          <pre style={{
            fontSize: 13, fontFamily: "ui-monospace, monospace",
            background: "#F4F2ED", border: "1px solid #EAE8E3", borderRadius: 8,
            padding: 16, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 240, overflow: "auto",
          }}>
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
          <div style={{ marginTop: 24 }}>
            <button
              onClick={reset}
              style={{
                background: "#009B87", color: "#FFFFFF", border: 0,
                padding: "12px 20px", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
