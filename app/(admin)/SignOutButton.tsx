"use client";

import * as React from "react";
import { signOut } from "next-auth/react";

export function SignOutButton(): React.ReactElement {
  const [busy, setBusy] = React.useState(false);

  async function onClick(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      // Never trust whatever absolute URL next-auth returns (Railway internal
      // host bleed). Use a relative callback and navigate ourselves as a
      // fallback if signOut throws or returns a weird URL.
      await signOut({ redirect: false });
      window.location.href = "/sign-in";
    } catch (err) {
      console.error("[sign-out] failed", err);
      window.location.href = "/sign-in";
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-small text-text-muted hover:text-text transition-colors duration-sm disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
