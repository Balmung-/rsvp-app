"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

export function NewEventForm(): React.ReactElement {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [venueName, setVenueName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        venueName: venueName || undefined,
        startsAt: new Date(startsAt).toISOString(),
        timezone,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!json.ok) {
      setError(json.error ?? "Failed to create event.");
      return;
    }
    router.push(`/events/${json.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="annual-reception-2026" required />
      </div>
      <div>
        <Label htmlFor="venueName">Venue</Label>
        <Input id="venueName" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="startsAt">Starts at</Label>
        <Input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </div>
      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}
      <div className="pt-2">
        <Button type="submit" loading={submitting}>Create</Button>
      </div>
    </form>
  );
}
