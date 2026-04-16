"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

interface State {
  name: string;
  defaultLocale: "en" | "ar";
  defaultTimezone: string;
  brandAccent: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
}

export function BrandForm({
  initial,
  canEdit,
}: {
  initial: State;
  canEdit: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = React.useState<State>(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  function set<K extends keyof State>(k: K, v: State[K]): void {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    setOk(false);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        defaultLocale: form.defaultLocale,
        defaultTimezone: form.defaultTimezone,
        brandAccent: form.brandAccent,
        logoUrl: form.logoUrl || null,
        supportEmail: form.supportEmail || null,
        supportPhone: form.supportPhone || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      setOk(true);
      router.refresh();
      return;
    }
    setError(json.error ?? "Could not save.");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <Label>Organisation name</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Default locale</Label>
          <select
            value={form.defaultLocale}
            onChange={(e) => set("defaultLocale", e.target.value as "en" | "ar")}
            disabled={!canEdit}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-body"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <Label>Default timezone</Label>
          <Input value={form.defaultTimezone} onChange={(e) => set("defaultTimezone", e.target.value)} disabled={!canEdit} required />
        </div>
      </div>

      <div>
        <Label>Brand accent</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.brandAccent}
            onChange={(e) => set("brandAccent", e.target.value)}
            disabled={!canEdit}
            className="h-10 w-14 rounded-md border border-border bg-surface cursor-pointer"
            aria-label="Brand accent colour"
          />
          <Input
            value={form.brandAccent}
            onChange={(e) => set("brandAccent", e.target.value)}
            disabled={!canEdit}
            pattern="#[0-9A-Fa-f]{6}"
            className="font-mono uppercase"
          />
        </div>
        <p className="text-small text-text-subtle mt-1">Used on the public RSVP page and email accent.</p>
      </div>

      <div>
        <Label>Logo URL</Label>
        <Input
          type="url"
          value={form.logoUrl}
          onChange={(e) => set("logoUrl", e.target.value)}
          disabled={!canEdit}
          placeholder="/brand/ministry-of-media.png or https://…"
        />
        <p className="text-small text-text-subtle mt-1">Relative paths resolve against your domain. Drop the asset into public/brand/.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Support email</Label>
          <Input type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} disabled={!canEdit} />
        </div>
        <div>
          <Label>Support phone</Label>
          <Input value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} disabled={!canEdit} />
        </div>
      </div>

      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}
      {ok ? <p role="status" className="text-small text-success">Saved.</p> : null}

      {canEdit ? (
        <div className="pt-2">
          <Button type="submit" loading={busy}>Save changes</Button>
        </div>
      ) : (
        <p className="text-small text-text-muted">Read-only. Owner role is required to edit brand settings.</p>
      )}
    </form>
  );
}
