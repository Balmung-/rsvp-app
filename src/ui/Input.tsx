"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-surface text-text",
        "h-11 md:h-10 px-3 text-body",
        "rounded-md border border-border",
        "placeholder:text-text-subtle",
        "transition-colors duration-sm ease-std",
        "hover:border-border-strong focus:border-border-strong",
        "outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        "disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full bg-surface text-text",
        "min-h-[88px] px-3 py-2 text-body",
        "rounded-md border border-border",
        "placeholder:text-text-subtle",
        "transition-colors duration-sm ease-std",
        "hover:border-border-strong focus:border-border-strong",
        "outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        "resize-vertical",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-small text-text-muted mb-1.5 inline-block", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
