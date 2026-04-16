"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/Button";
import { Input, Label, Textarea } from "@/ui/Input";

export interface TemplateFormState {
  name: string;
  channel: "SMS" | "EMAIL";
  locale: "en" | "ar";
  subject: string;
  preheader: string;
  bodyMarkdown: string;
  smsBody: string;
  isDefault: boolean;
}

const VARIABLES: { key: string; label: string }[] = [
  { key: "{{guest.firstName}}", label: "First name" },
  { key: "{{guest.fullName}}", label: "Full name" },
  { key: "{{event.title}}", label: "Event title" },
  { key: "{{event.startsAt}}", label: "Date & time" },
  { key: "{{event.venueName}}", label: "Venue" },
  { key: "{{rsvp.link}}", label: "RSVP link" },
  { key: "{{rsvp.deadline}}", label: "Deadline" },
  { key: "{{org.name}}", label: "Organisation name" },
];

export function TemplateForm({
  mode,
  templateId,
  initial,
}: {
  mode: "create" | "edit";
  templateId?: string;
  initial: TemplateFormState;
}): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  function set<K extends keyof TemplateFormState>(k: K, v: TemplateFormState[K]): void {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const url = mode === "edit" ? `/api/templates/${templateId}` : "/api/templates";
    const method = mode === "edit" ? "PATCH" : "POST";
    const body = {
      name: form.name,
      channel: form.channel,
      locale: form.locale,
      subject: form.channel === "EMAIL" ? form.subject : null,
      preheader: form.channel === "EMAIL" ? form.preheader : null,
      bodyMarkdown: form.channel === "EMAIL" ? form.bodyMarkdown : null,
      smsBody: form.channel === "SMS" ? form.smsBody : null,
      isDefault: form.isDefault,
    };
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      router.push("/templates");
      router.refresh();
      return;
    }
    setError(json.error ?? "Could not save.");
  }

  async function onDelete(): Promise<void> {
    if (!templateId) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      router.push("/templates");
      router.refresh();
      return;
    }
    setError(json.error === "TEMPLATE_IN_USE" ? "This template is referenced by past campaigns and cannot be deleted." : (json.error ?? "Could not delete."));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Channel</Label>
          <select
            value={form.channel}
            onChange={(e) => set("channel", e.target.value as "SMS" | "EMAIL")}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-body"
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
        <div>
          <Label>Locale</Label>
          <select
            value={form.locale}
            onChange={(e) => set("locale", e.target.value as "en" | "ar")}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-body"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {form.channel === "EMAIL" ? (
        <>
          <div>
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} />
          </div>
          <div>
            <Label>Preheader</Label>
            <Input value={form.preheader} onChange={(e) => set("preheader", e.target.value)} />
          </div>
          <div>
            <Label>Body (HTML or Markdown allowed)</Label>
            <Textarea
              rows={10}
              value={form.bodyMarkdown}
              onChange={(e) => set("bodyMarkdown", e.target.value)}
              dir={form.locale === "ar" ? "rtl" : "ltr"}
            />
          </div>
        </>
      ) : (
        <div>
          <Label>SMS body</Label>
          <Textarea
            rows={4}
            value={form.smsBody}
            onChange={(e) => set("smsBody", e.target.value)}
            dir={form.locale === "ar" ? "rtl" : "ltr"}
          />
          <p className="text-small text-text-subtle mt-1">
            {form.smsBody.length} chars · single-segment limit: 160 (GSM-7) / 70 (UCS-2 with non-Latin)
          </p>
        </div>
      )}

      <details className="text-small">
        <summary className="cursor-pointer text-text-muted">Available variables</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => navigator.clipboard?.writeText(v.key)}
              className="text-start px-3 py-2 border border-border rounded hover:bg-surface-alt transition-colors duration-sm"
              title="Click to copy"
            >
              <div className="font-mono text-text">{v.key}</div>
              <div className="text-text-subtle">{v.label}</div>
            </button>
          ))}
        </div>
      </details>

      <label className="inline-flex items-center gap-2 text-body text-text-muted">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="h-4 w-4"
        />
        Use as default for this channel + locale
      </label>

      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy}>{mode === "edit" ? "Save" : "Create"}</Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/templates")}>Cancel</Button>
        </div>
        {mode === "edit" ? (
          confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-small text-text-muted">Delete this template?</span>
              <Button type="button" variant="danger" size="sm" onClick={onDelete} disabled={busy}>Confirm</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>No</Button>
            </div>
          ) : (
            <Button type="button" variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>Delete</Button>
          )
        ) : null}
      </div>
    </form>
  );
}
