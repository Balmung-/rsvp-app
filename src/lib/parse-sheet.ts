// Client-side sheet parser. Accepts CSV or XLSX and returns a normalized
// { headers, rows } shape. XLSX is dynamic-imported so it only ships when
// the import UI opens.

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export async function parseSheetFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".tsv") || file.type === "text/csv") {
    const text = await file.text();
    return parseDelimited(text, name.endsWith(".tsv") ? "\t" : ",");
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const firstName = wb.SheetNames[0];
    if (!firstName) return { headers: [], rows: [] };
    const sheet = wb.Sheets[firstName]!;
    const arr = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    if (arr.length === 0) return { headers: [], rows: [] };
    const headers = (arr[0] ?? []).map((v) => String(v ?? "").trim());
    const rows = arr.slice(1)
      .map((row) => headers.map((_, i) => String(row[i] ?? "").trim()))
      .filter((row) => row.some((c) => c.length > 0));
    return { headers, rows };
  }
  throw new Error("Unsupported file type. Use .csv or .xlsx.");
}

function parseDelimited(text: string, delim: string): ParsedSheet {
  // Minimal RFC-4180 CSV parser. Handles quoted fields with escaped quotes
  // and newlines inside quotes. No external dep.
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === delim) { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.some((v) => v.length > 0)) rows.push(cur);
        cur = [];
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); if (cur.some((v) => v.length > 0)) rows.push(cur); }

  const headers = (rows[0] ?? []).map((v) => v.trim());
  return {
    headers,
    rows: rows.slice(1).map((row) => headers.map((_, i) => (row[i] ?? "").trim())),
  };
}

// Known target fields for mapping.
export type FieldKey =
  | "ignore"
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "preferredLocale"
  | "partySizeLimit"
  | "allowPlusOne"
  | "tags";

export const FIELD_LABELS: Record<FieldKey, string> = {
  ignore: "— ignore —",
  firstName: "First name",
  lastName: "Last name",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  preferredLocale: "Preferred locale (en / ar)",
  partySizeLimit: "Party size limit",
  allowPlusOne: "Allow plus-one",
  tags: "Tags (comma-separated)",
};

const HINTS: Record<FieldKey, RegExp[]> = {
  ignore: [],
  firstName: [/^first.?name$/i, /^given.?name$/i, /^الاسم.?الأول/, /^اسم.?شخصي/],
  lastName: [/^last.?name$/i, /^surname$/i, /^family.?name$/i, /^اسم.?العائلة/],
  fullName: [/^(full.?)?name$/i, /^الاسم(.?الكامل)?$/, /^name$/i],
  email: [/^e.?mail$/i, /^بريد/],
  phone: [/^(phone|mobile|cell|whats?app|number|tel)$/i, /^جوال/, /^هاتف/, /^رقم/],
  preferredLocale: [/^(locale|lang(uage)?)$/i, /^اللغة/],
  partySizeLimit: [/^(party|guests|seats?|pax)$/i, /^عدد/],
  allowPlusOne: [/^(plus[.\s-]?one|\+1|companion)$/i, /^مرافق/],
  tags: [/^tags?$/i, /^(category|groups?)$/i, /^الوسوم/, /^التصنيف/],
};

export function autoMapColumns(headers: string[]): FieldKey[] {
  const used = new Set<FieldKey>();
  return headers.map((h) => {
    const clean = h.trim();
    if (!clean) return "ignore";
    for (const [field, patterns] of Object.entries(HINTS) as [FieldKey, RegExp[]][]) {
      if (field === "ignore") continue;
      if (used.has(field)) continue;
      if (patterns.some((r) => r.test(clean))) {
        used.add(field);
        return field;
      }
    }
    return "ignore";
  });
}

function normalizeLocale(v: string): "en" | "ar" | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (s === "en" || s === "english" || s.startsWith("en-") || s.startsWith("en_")) return "en";
  if (s === "ar" || s === "arabic" || s.startsWith("ar-") || s.startsWith("ar_") || /العربية|عربي/.test(v)) return "ar";
  return undefined;
}

function normalizeBool(v: string): boolean | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (["true", "1", "yes", "y", "نعم"].includes(s)) return true;
  if (["false", "0", "no", "n", "لا"].includes(s)) return false;
  return undefined;
}

export interface MappedRow {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  preferredLocale?: "en" | "ar";
  partySizeLimit?: number;
  allowPlusOne?: boolean;
  tags?: string;
}

export function applyMapping(rows: string[][], mapping: FieldKey[]): MappedRow[] {
  return rows.map((row) => {
    const m: MappedRow = {};
    mapping.forEach((field, i) => {
      const raw = (row[i] ?? "").trim();
      if (!raw || field === "ignore") return;
      switch (field) {
        case "firstName": m.firstName = raw; break;
        case "lastName": m.lastName = raw; break;
        case "fullName": m.fullName = raw; break;
        case "email": m.email = raw; break;
        case "phone": m.phone = raw; break;
        case "preferredLocale": m.preferredLocale = normalizeLocale(raw); break;
        case "partySizeLimit": {
          const n = parseInt(raw, 10);
          if (Number.isFinite(n) && n > 0) m.partySizeLimit = n;
          break;
        }
        case "allowPlusOne": m.allowPlusOne = normalizeBool(raw); break;
        case "tags": m.tags = raw; break;
      }
    });
    return m;
  });
}
