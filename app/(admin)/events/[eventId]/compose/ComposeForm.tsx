"use client";

import { useMemo, useState } from "react";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";
import { TestSend } from "./TestSend";

interface TemplateLite {
  id: string;
  name: string;
  channel: "SMS" | "EMAIL";
  locale: string;
}

type Channel = "SMS" | "EMAIL";
type Timing = "now" | "later";

export function ComposeForm({
  eventId,
  templates,
}: {
  eventId: string;
  templates: TemplateLite[];
}): React.ReactElement {
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const scoped = useMemo(
    () => templates.filter((t) => t.channel === channel && t.locale === locale),
    [templates, channel, locale]
  );
  const [templateId, setTemplateId] = useState<string>(scoped[0]?.id ?? "");
  const [audience, setAudience] = useState<"PENDING" | "ALL">("PENDING");
  const [timing, setTiming] = useState<Timing>("now");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [preview, setPreview] = useState<{ samples: Array<Record<string, unknown>>; channel: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPreview(campaignId: string): Promise<void> {
    const res = await fetch(`/api/campaigns/${campaignId}/preview`, { method: "POST" });
    const json = await res.json();
    if (json.ok) setPreview({ samples: json.samples, channel: json.channel });
  }

  async function createCampaign(): Promise<string | null> {
    const body: Record<string, unknown> = {
      eventId,
      channel,
      templateId,
      audienceFilter: audience === "PENDING" ? { rsvpStatus: ["PENDING"] } : {},
    };
    if (timing === "later" && scheduledAt) {
      const iso = new Date(scheduledAt).toISOString();
      body.scheduledAt = iso;
    }
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) {
      setMessage(json.error ?? "Failed to create campaign.");
      return null;
    }
    return json.id as string;
  }

  async function onPreview(): Promise<void> {
    setMessage(null);
    const id = await createCampaign();
    if (id) await loadPreview(id);
  }

  async function onSend(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    const id = await createCampaign();
    if (!id) {
      setSubmitting(false);
      return;
    }
    const res = await fetch(`/api/campaigns/${id}/dispatch`, { method: "POST" });
    const json = await res.json();
    setSubmitting(false);
    if (json.ok) {
      setMessage(
        json.scheduled
          ? `Scheduled. Will dispatch in ~${Math.round(json.startAfterSeconds / 60)} min.`
          : "Queued. Watch the Delivery tab for progress."
      );
    } else {
      setMessage(json.error ?? "Dispatch failed.");
    }
  }

  const sample = preview?.samples[sampleIndex] as (Record<string, unknown> | undefined);

  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const minScheduled = toLocalDatetimeInput(now);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        <Segment
          label="Channel"
          value={channel}
          options={[{ value: "EMAIL", label: "Email" }, { value: "SMS", label: "SMS" }]}
          onChange={(v) => setChannel(v as Channel)}
        />
        <Segment
          label="Locale"
          value={locale}
          options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]}
          onChange={(v) => setLocale(v as "ar" | "en")}
        />

        <div>
          <Label>Template</Label>
          <select
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-body"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {scoped.length === 0 ? (
              <option value="">No template for this channel + locale</option>
            ) : (
              scoped.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))
            )}
          </select>
        </div>

        <Segment
          label="Audience"
          value={audience}
          options={[{ value: "PENDING", label: "Pending only" }, { value: "ALL", label: "Everyone" }]}
          onChange={(v) => setAudience(v as "PENDING" | "ALL")}
        />

        <Segment
          label="Schedule"
          value={timing}
          options={[{ value: "now", label: "Send now" }, { value: "later", label: "Schedule" }]}
          onChange={(v) => setTiming(v as Timing)}
        />

        {timing === "later" ? (
          <div>
            <Label htmlFor="scheduledAt">Send at</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              min={minScheduled}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <Button
            onClick={onSend}
            loading={submitting}
            disabled={!templateId || (timing === "later" && !scheduledAt)}
          >
            {timing === "later" ? "Schedule send" : "Send now"}
          </Button>
          <Button variant="secondary" onClick={onPreview} disabled={!templateId}>Preview</Button>
          <TestSend eventId={eventId} templateId={templateId} channel={channel} />
        </div>
        {message ? <p className="text-small text-text-muted">{message}</p> : null}
      </form>

      <aside>
        <div className="text-micro text-text-subtle mb-3 flex items-center justify-between">
          <span>Preview</span>
          {preview && preview.samples.length > 1 ? (
            <button
              type="button"
              onClick={() => setSampleIndex((i) => (i + 1) % preview.samples.length)}
              className="text-small text-text-muted hover:text-text"
            >
              Shuffle preview
            </button>
          ) : null}
        </div>

        {!sample ? (
          <div className="border border-border rounded-lg p-8 text-text-subtle text-body">
            Tap Preview to render sample messages.
          </div>
        ) : preview?.channel === "EMAIL" ? (
          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <div className="px-5 py-4 border-b border-border text-small text-text-muted">
              <div>To: {String(sample.guest)}</div>
              <div>Subject: <span className="text-text font-medium">{String(sample.subject)}</span></div>
            </div>
            <div
              className="p-5 prose prose-sm max-w-none text-text"
              dangerouslySetInnerHTML={{ __html: String(sample.html) }}
            />
          </div>
        ) : (
          <div className="max-w-[320px] mx-auto border border-border rounded-[24px] p-4 bg-surface">
            <div className="text-micro text-text-subtle mb-2">To: {String(sample.guest)}</div>
            <div className="bg-surface-alt rounded-2xl p-4 text-body whitespace-pre-wrap">
              {String(sample.body)}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}): React.ReactElement {
  return (
    <div>
      <Label>{label}</Label>
      <div className="inline-flex items-stretch border border-border rounded-md overflow-hidden bg-surface">
        {options.map((opt, i) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                "h-10 px-4 text-body transition-colors duration-sm",
                i > 0 ? "border-s border-border" : "",
                active ? "bg-surface-alt text-text" : "text-text-muted hover:text-text",
              ].join(" ")}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
