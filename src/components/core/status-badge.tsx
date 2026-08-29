import { Badge } from "@/components/core/badge";

// Visual Hierarchy Redesign spec, Section 4/19/20: the canonical
// SUCCESS/WARNING/DANGER/INFO/NEUTRAL vocabulary from Section 4,
// exposed as its own named component per Section 20 rather than
// callers picking Badge's lower-level variant names directly. Color is
// never the only signal — this always renders as visible text (Section
// 19), same as the Badge it wraps. Existing Badge call sites (Labs,
// Vitals, Conditions...) are untouched; this is the entry point for new
// Dashboard/Overview-style usage going forward.
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_TO_BADGE_VARIANT = {
  success: "normal",
  warning: "attention",
  danger: "urgent",
  info: "info",
  neutral: "neutral",
} as const;

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return <Badge variant={TONE_TO_BADGE_VARIANT[tone]}>{children}</Badge>;
}
