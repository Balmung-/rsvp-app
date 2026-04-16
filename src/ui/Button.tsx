"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
}

const variantCls: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:brightness-95 active:brightness-90 disabled:opacity-50",
  secondary:
    "bg-transparent text-text border border-border-strong hover:bg-surface-alt disabled:opacity-50",
  ghost:
    "bg-transparent text-text hover:bg-surface-alt disabled:opacity-50",
  danger:
    "bg-transparent text-danger border border-danger/30 hover:bg-danger/5 disabled:opacity-50",
};

const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-small rounded-md",
  md: "h-10 px-4 text-body rounded-md",
  lg: "h-14 px-6 text-body-lg rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", asChild, className, loading, disabled, children, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium select-none",
          "transition-[background,opacity,filter] duration-sm ease-std",
          "active:scale-[0.98] active:duration-xs",
          variantCls[variant],
          sizeCls[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
