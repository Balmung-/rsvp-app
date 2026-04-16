"use client";

import * as React from "react";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

export function ChangePasswordForm(): React.ReactElement {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      return;
    }
    setError(
      json.error === "WRONG_CURRENT_PASSWORD"
        ? "Current password is incorrect."
        : json.error === "NEW_PASSWORD_SAME"
          ? "New password must be different from current."
          : json.error ?? "Could not change password."
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="current">Current password</Label>
        <Input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="next">New password</Label>
        <Input id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      </div>
      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}
      {ok ? <p role="status" className="text-small text-success">Password updated.</p> : null}
      <div className="pt-2">
        <Button type="submit" loading={busy}>Update password</Button>
      </div>
    </form>
  );
}
