"use client";

import { signOut } from "next-auth/react";

export function SignOutButton(): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      className="text-small text-text-muted hover:text-text transition-colors duration-sm"
    >
      Sign out
    </button>
  );
}
