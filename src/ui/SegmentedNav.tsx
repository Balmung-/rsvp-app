"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface SegmentedNavItem {
  href: string;
  label: string;
  exact?: boolean;
}

export function SegmentedNav({ items }: { items: SegmentedNavItem[] }): React.ReactElement {
  const pathname = usePathname();
  return (
    <nav className="relative flex gap-6 border-b border-border" role="tablist">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative -mb-px py-3 text-body transition-colors duration-sm ease-std",
              active ? "text-text" : "text-text-muted hover:text-text"
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 -bottom-px h-px bg-accent transition-opacity duration-sm ease-std",
                active ? "opacity-100" : "opacity-0"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
