import { formatInTimeZone } from "date-fns-tz";

export function formatEventDateTime(date: Date, tz: string, locale: "en" | "ar"): string {
  const pattern = locale === "ar" ? "EEEE d MMMM yyyy · h:mm a" : "EEEE, d MMM yyyy · h:mm a";
  return formatInTimeZone(date, tz, pattern, { locale: undefined });
}

export function formatEventDate(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "d MMM yyyy");
}

export function formatTimeShort(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "h:mm a");
}

export function tzAbbrev(tz: string, date: Date = new Date()): string {
  try {
    return formatInTimeZone(date, tz, "zzz");
  } catch {
    return tz;
  }
}
