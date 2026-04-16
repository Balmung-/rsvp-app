"use client";

import * as React from "react";
import { SideSheet } from "@/ui/SideSheet";
import { Button } from "@/ui/Button";
import { FileDrop } from "@/ui/FileDrop";
import { applyMapping, autoMapColumns, FIELD_LABELS, parseSheetFile, type FieldKey, type ParsedSheet } from "@/lib/parse-sheet";

type Phase = "drop" | "map" | "submitting" | "result";

interface Result {
  created: number;
  updated: number;
  skipped: number;
}

export function ImportSheet({
  eventId,
  open,
  onOpenChange,
  onDone,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}): React.ReactElement {
  const [phase, setPhase] = React.useState<Phase>("drop");
  const [parsed, setParsed] = React.useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = React.useState<FieldKey[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPhase("drop");
      setParsed(null);
      setMapping([]);
      setError(null);
      setResult(null);
    }
  }, [open]);

  async function onFile(file: File): Promise<void> {
    setError(null);
    try {
      const sheet = await parseSheetFile(file);
      if (sheet.headers.length === 0 || sheet.rows.length === 0) {
        setError("The file appears to be empty.");
        return;
      }
      setParsed(sheet);
      setMapping(autoMapColumns(sheet.headers));
      setPhase("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file.");
    }
  }

  async function onCommit(): Promise<void> {
    if (!parsed) return;
    setPhase("submitting");
    setError(null);
    const mapped = applyMapping(parsed.rows, mapping);
    const valid = mapped.filter((r) => r.fullName || r.firstName || r.email || r.phone);
    if (valid.length === 0) {
      setError("No rows have a name, email, or phone after mapping.");
      setPhase("map");
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/invitees/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: valid }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Import failed (${res.status}).`);
        setPhase("map");
        return;
      }
      setResult({ created: json.created, updated: json.updated, skipped: json.skipped });
      setPhase("result");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setPhase("map");
    }
  }

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Import guests"
      description="CSV or Excel file. Names and phones or emails required."
      size="lg"
    >
      {phase === "drop" ? (
        <div className="flex flex-col gap-5">
          <FileDrop
            accept=".csv,.tsv,.xlsx,.xls,text/csv"
            onFile={onFile}
            label="Drop a CSV or Excel file"
            hint="Accepted: .csv, .xlsx. First row should contain column headers."
          />
          {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}
          <details className="text-small text-text-muted">
            <summary className="cursor-pointer">Expected columns</summary>
            <div className="mt-2 leading-relaxed">
              Headers are matched fuzzily. The following are auto-detected:
              <ul className="mt-2 list-disc ps-5 space-y-0.5">
                <li><span className="text-text">Full name</span> / First name / Last name</li>
                <li><span className="text-text">Phone</span> (any format — will be normalised to E.164)</li>
                <li><span className="text-text">Email</span></li>
                <li>Preferred locale (en / ar)</li>
                <li>Party size (number)</li>
                <li>Allow plus-one (yes / no)</li>
                <li>Tags (comma-separated)</li>
              </ul>
              Duplicates within the organisation are matched by email or phone and merged.
            </div>
          </details>
        </div>
      ) : null}

      {phase === "map" && parsed ? (
        <MapStep
          parsed={parsed}
          mapping={mapping}
          setMapping={setMapping}
          error={error}
          onBack={() => setPhase("drop")}
          onCommit={onCommit}
        />
      ) : null}

      {phase === "submitting" ? (
        <div className="flex items-center gap-3 text-body text-text-muted">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Importing…
        </div>
      ) : null}

      {phase === "result" && result ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "New", value: result.created },
              { label: "Updated", value: result.updated },
              { label: "Skipped", value: result.skipped },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-micro text-text-subtle mb-1">{m.label}</div>
                <div className="text-[32px] leading-[36px] font-medium tabular-nums">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setPhase("drop")} variant="secondary">Import another</Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      ) : null}
    </SideSheet>
  );
}

function MapStep({
  parsed,
  mapping,
  setMapping,
  error,
  onBack,
  onCommit,
}: {
  parsed: ParsedSheet;
  mapping: FieldKey[];
  setMapping: React.Dispatch<React.SetStateAction<FieldKey[]>>;
  error: string | null;
  onBack: () => void;
  onCommit: () => void;
}): React.ReactElement {
  const totalMapped = mapping.filter((m) => m !== "ignore").length;
  const hasName = mapping.includes("fullName") || mapping.includes("firstName");
  const hasContact = mapping.includes("email") || mapping.includes("phone");
  const canImport = hasName && hasContact && parsed.rows.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-small text-text-muted">
        {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} · {parsed.headers.length} column{parsed.headers.length === 1 ? "" : "s"} · {totalMapped} mapped
      </div>

      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-surface-alt">
              {parsed.headers.map((h, i) => (
                <th key={i} className="text-start px-3 py-2 border-b border-border min-w-[140px]">
                  <div className="text-text text-body-lg font-medium mb-1 truncate">{h || <span className="text-text-subtle">(blank)</span>}</div>
                  <select
                    value={mapping[i] ?? "ignore"}
                    onChange={(e) => {
                      const v = e.target.value as FieldKey;
                      setMapping((prev) => {
                        const next = [...prev];
                        next[i] = v;
                        // enforce uniqueness for non-ignore mappings
                        if (v !== "ignore") {
                          for (let j = 0; j < next.length; j++) {
                            if (j !== i && next[j] === v) next[j] = "ignore";
                          }
                        }
                        return next;
                      });
                    }}
                    className="w-full h-8 px-2 rounded border border-border bg-surface text-small"
                  >
                    {(Object.entries(FIELD_LABELS) as [FieldKey, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.rows.slice(0, 5).map((row, ri) => (
              <tr key={ri} className="border-t border-border">
                {parsed.headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-2 text-text-muted truncate max-w-[200px]">{row[ci] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasName ? <p className="text-small text-text-muted">Map a <span className="text-text">Full name</span> or <span className="text-text">First name</span> column.</p> : null}
      {!hasContact ? <p className="text-small text-text-muted">Map at least one of <span className="text-text">Email</span> or <span className="text-text">Phone</span>.</p> : null}

      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={onCommit} disabled={!canImport}>Import {parsed.rows.length} rows</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </div>
  );
}
