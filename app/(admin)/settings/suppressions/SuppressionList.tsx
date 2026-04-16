"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

interface Item {
  id: string;
  channel: "SMS" | "EMAIL";
  value: string;
  reason: string;
  source: string;
  createdAt: string;
}

export function SuppressionList({
  initial,
  canEdit,
}: {
  initial: Item[];
  canEdit: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [items, setItems] = React.useState<Item[]>(initial);
  const [channel, setChannel] = React.useState<"EMAIL" | "SMS">("EMAIL");
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add(): Promise<void> {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/suppressions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel, value, reason: "MANUAL" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.ok) {
      setValue("");
      router.refresh();
    } else {
      setError(
        json.error === "INVALID_EMAIL" ? "Not a valid email." :
        json.error === "INVALID_PHONE" ? "Not a valid phone number." :
        json.error ?? "Could not add."
      );
    }
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(`/api/suppressions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {canEdit ? (
        <section className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Channel</Label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "EMAIL" | "SMS")}
              className="h-10 px-3 rounded-md bg-surface border border-border text-body"
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div className="flex-1 min-w-[240px]">
            <Label>{channel === "EMAIL" ? "Email address" : "Phone number"}</Label>
            <Input
              type={channel === "EMAIL" ? "email" : "tel"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={channel === "EMAIL" ? "person@example.com" : "+9665XXXXXXXX"}
            />
          </div>
          <Button onClick={add} loading={busy} disabled={!value.trim()}>Suppress</Button>
        </section>
      ) : null}
      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}

      <section className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Value</th>
              <th className="py-3 px-4 font-medium">Channel</th>
              <th className="py-3 px-4 font-medium">Reason</th>
              <th className="py-3 px-4 font-medium">Source</th>
              <th className="py-3 px-4 font-medium text-end">Added</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                <td className="py-3 ps-0 pe-4 text-text font-mono text-small">{i.value}</td>
                <td className="py-3 px-4 text-text-muted">{i.channel.toLowerCase()}</td>
                <td className="py-3 px-4 text-text-muted">{i.reason.toLowerCase()}</td>
                <td className="py-3 px-4 text-text-muted">{i.source}</td>
                <td className="py-3 px-4 text-end tabular-nums text-text-subtle">{new Date(i.createdAt).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-end">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => remove(i.id)}
                      className="text-small text-text-muted hover:text-danger transition-colors"
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-text-muted">No suppressions.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
