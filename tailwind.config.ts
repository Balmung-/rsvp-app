import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-strong": "var(--accent-strong)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionTimingFunction: {
        std: "var(--ease-std)",
        emph: "var(--ease-emph)",
      },
      transitionDuration: {
        xs: "120ms",
        sm: "180ms",
        md: "220ms",
        lg: "320ms",
      },
      fontFamily: {
        latin: ["var(--font-latin)"],
        arabic: ["var(--font-arabic)"],
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "3.75rem", letterSpacing: "-0.02em", fontWeight: "500" }],
        h1: ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.015em", fontWeight: "500" }],
        h2: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.01em", fontWeight: "500" }],
        h3: ["1.25rem", { lineHeight: "1.5rem", letterSpacing: "-0.005em", fontWeight: "500" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.625rem", fontWeight: "400" }],
        body: ["0.9375rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        small: ["0.8125rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em", fontWeight: "500" }],
      },
      spacing: {
        "0.5": "0.125rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-slide-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "reveal": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms var(--ease-std) both",
        "fade-slide-up": "fade-slide-up 180ms var(--ease-std) both",
        "reveal": "reveal 220ms var(--ease-std) both",
        "slide-up": "slide-up 220ms var(--ease-emph) both",
      },
    },
  },
  plugins: [],
};

export default config;
