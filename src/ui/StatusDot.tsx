import { cn } from "@/lib/cn";

type Variant = "neutral" | "success" | "warn" | "danger" | "muted";

const cls: Record<Variant, string> = {
  neutral: "bg-text",
  success: "bg-success",
  warn: "bg-[#B36A00]",
  danger: "bg-danger",
  muted: "bg-text-subtle",
};

export function StatusDot({ variant = "neutral", className }: { variant?: Variant; className?: string }): React.ReactElement {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-1.5 w-1.5 rounded-full align-middle", cls[variant], className)}
    />
  );
}
