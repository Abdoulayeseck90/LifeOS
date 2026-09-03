import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

// Color values sourced from LifeOS Master Spec, Section 51.4 (Design System)
// and Section 51.4.1 (Semantic Colors). Do not hardcode these hex values
// elsewhere in the app — reference the Tailwind classes below instead,
// so a future palette change happens in exactly one place.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "#0F9EA0", // Teal — primary action color
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#0F172A", // Deep Navy — headers, high-emphasis text
          foreground: "#FFFFFF",
        },
        // Surfaces
        background: "#FFFFFF",
        surface: "#F8FAFC", // Very Light Gray — cards, panels
        muted: "#64748B", // Slate Gray — secondary/muted text
        // Semantic status (Section 51.4.1; "info" added for the
        // Visual Hierarchy Redesign spec's INFO category — neutral
        // informational messages, distinct from teal's primary/action
        // meaning and from the warning/danger/success trio above).
        status: {
          attention: "#BA7517", // Amber — needs attention
          urgent: "#A32D2D", // Muted red — abnormal / urgent
          normal: "#3B6D11", // Green — normal / confirmed
          inactive: "#5F5E5A", // Gray — inactive / archived
          info: "#1D5FA8", // Blue — informational / neutral medical information
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
      },
      // Note reading view (Notes Reading Experience spec): the `prose`
      // class is what gives long-form Markdown content comfortable
      // typography (heading hierarchy, paragraph/list spacing, a
      // sensible reading measure) without hand-rolling those rules —
      // recolored here to LifeOS's own palette instead of the plugin's
      // default gray theme, per the "never hardcode brand colors
      // outside this file" rule above.
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.secondary.DEFAULT"),
            "--tw-prose-headings": theme("colors.secondary.DEFAULT"),
            "--tw-prose-lead": theme("colors.muted"),
            "--tw-prose-links": theme("colors.primary.DEFAULT"),
            "--tw-prose-bold": theme("colors.secondary.DEFAULT"),
            "--tw-prose-counters": theme("colors.muted"),
            "--tw-prose-bullets": theme("colors.muted"),
            "--tw-prose-hr": theme("colors.surface"),
            "--tw-prose-quotes": theme("colors.secondary.DEFAULT"),
            "--tw-prose-quote-borders": theme("colors.primary.DEFAULT"),
            "--tw-prose-captions": theme("colors.muted"),
            "--tw-prose-code": theme("colors.secondary.DEFAULT"),
            "--tw-prose-pre-code": theme("colors.secondary.DEFAULT"),
            "--tw-prose-pre-bg": theme("colors.surface"),
            "--tw-prose-th-borders": theme("colors.surface"),
            "--tw-prose-td-borders": theme("colors.surface"),
            maxWidth: "65ch",
            a: { fontWeight: "500", textDecoration: "underline" },
            // Default prose wraps inline code in decorative backticks —
            // cleaner without them against a tinted background instead.
            code: {
              backgroundColor: theme("colors.surface"),
              borderRadius: "4px",
              padding: "0.15em 0.4em",
              fontWeight: "400",
            },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
