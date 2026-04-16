"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SideSheet } from "@/ui/SideSheet";
import { Button } from "@/ui/Button";
import { Input, Label, Textarea } from "@/ui/Input";

export interface EditEventInitial {
  title: string;
  slug: string;
  description: string | null;
  venueName: string | null;
  venueAddress: string | null;
  mapUrl: string | null;
  startsAt: string; // ISO
  endsAt: string | null;
  timezone: string;
  rsvpDeadline: string | null;
  dressCode: string | null;
  heroImageUrl: string | null;
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "ARCHIVED";
}

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditEventSheet({
  eventId,
  initial,
  open,
  onOpenChange,
}: {
  eventId: string;
  initial: EditEventInitial;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = React.useState({
    title: initial.title,
    slug: initial.slug,
    description: initial.description ?? "",
    venueName: initial.venueName ?? "",
    venueAddress: initial.venueAddress ?? "",
    mapUrl: initial.mapUrl ?? "",
    startsAt: isoToLocal(initial.startsAt),
    endsAt: isoToLocal(initial.endsAt),
    timezone: initial.timezone,
    rsvpDeadline: isoToLocal(initial.rsvpDeadline),
    dressCode: initial.dressCode ?? "",
    heroImageUrl: initial.heroImageUrl ?? "",
    status: initial.status,
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]): void {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function onSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      venueName: form.venueName || null,
      venueAddress: form.venueAddress || null,
      mapUrl: form.mapUrl || null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      timezone: form.timezone,
      rsvpDeadline: form.rsvpDeadline ? new Date(form.rsvpDeadline).toISOString() : null,
      dressCode: form.dressCode || null,
      heroImageUrl: form.heroImageUrl || null,
      status: form.status,
    };
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      onOpenChange(false);
      router.refresh();
      return;
    }
    setError(json.error ?? "Could not save changes.");
  }

  async function onDelete(): Promise<void> {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      onOpenChange(false);
      router.push("/events");
      return;
    }
    setError(json.error ?? "Could not delete event.");
  }

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title="Event settings" size="lg">
      <form onSubmit={onSave} className="flex flex-col gap-5">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </Field>
        <Field label="Slug" hint="URL-safe identifier. Lowercase letters, numbers, and hyphens.">
          <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} pattern="[a-z0-9-]+" required />
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Venue">
          <Input value={form.venueName} onChange={(e) => set("venueName", e.target.value)} />
        </Field>
        <Field label="Venue address">
          <Input value={form.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} />
        </Field>
        <Field label="Map URL">
          <Input type="url" placeholder="https://maps.google.com/?q=…" value={form.mapUrl} onChange={(e) => set("mapUrl", e.target.value)} />
        </Field>
        <Field label="Hero image URL">
          <Input type="url" placeholder="https://…" value={form.heroImageUrl} onChange={(e) => set("heroImageUrl", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts at">
            <Input type="datetime-local" required value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label="Ends at">
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Timezone">
            <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} required />
          </Field>
          <Field label="RSVP deadline">
            <Input type="datetime-local" value={form.rsvpDeadline} onChange={(e) => set("rsvpDeadline", e.target.value)} />
          </Field>
        </div>

        <Field label="Dress code">
          <Input value={form.dressCode} onChange={(e) => set("dressCode", e.target.value)} />
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as EditEventInitial["status"])}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-body"
          >
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="LIVE">Live</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>

        {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Button type="submit" loading={busy}>Save</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-small text-text-muted">Delete event and all data?</span>
              <Button type="button" variant="danger" size="sm" onClick={onDelete} disabled={busy}>Confirm delete</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>No</Button>
            </div>
          ) : (
            <Button type="button" variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>Delete event</Button>
          )}
        </div>
      </form>
    </SideSheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-small text-text-subtle mt-1">{hint}</p> : null}
    </div>
  );
}
