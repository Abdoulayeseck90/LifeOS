import type { Config } from "tailwindcss";

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
    },
  },
  plugins: [],
};

export default config;
