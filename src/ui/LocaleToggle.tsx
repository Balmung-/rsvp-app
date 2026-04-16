"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/cn";

export function LocaleToggle({ className }: { className?: string }): React.ReactElement {
  const locale = useLocale();
  const router = useRouter();
  const setLocale = (next: "en" | "ar") => {
    if (next === locale) return;
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.refresh();
  };
  return (
    <div role="group" className={cn("inline-flex items-center gap-1 text-small text-text-muted", className)}>
      <button
        type="button"
        className={cn("px-2 py-1 rounded transition-colors duration-sm", locale === "en" ? "text-text" : "hover:text-text")}
        onClick={() => setLocale("en")}
      >
        English
      </button>
      <span aria-hidden className="text-text-subtle">·</span>
      <button
        type="button"
        className={cn("px-2 py-1 rounded transition-colors duration-sm", locale === "ar" ? "text-text" : "hover:text-text")}
        onClick={() => setLocale("ar")}
      >
        العربية
      </button>
    </div>
  );
}
