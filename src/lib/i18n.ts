import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = (process.env.DEFAULT_LOCALE as Locale) || "ar";

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function pickLocale(...candidates: (string | null | undefined)[]): Locale {
  for (const c of candidates) {
    if (isLocale(c)) return c;
  }
  return DEFAULT_LOCALE;
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("locale")?.value;
  const headerLocale = (await headers()).get("x-locale");
  const locale = pickLocale(cookieLocale, headerLocale);
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages, timeZone: process.env.DEFAULT_TIMEZONE || "Asia/Riyadh" };
});
