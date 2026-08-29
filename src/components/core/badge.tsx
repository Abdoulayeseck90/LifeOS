// Generic small label — used where a tag/pill is needed but the content
// isn't a per-entity status (those keep their own dedicated badges,
// e.g. condition-status-badge.tsx — no forced migration). Maps to the
// existing status.* tokens only; never a one-off color.
const VARIANT_CLASSES = {
  neutral: "bg-surface text-muted",
  primary: "bg-primary/10 text-primary",
  urgent: "bg-status-urgent/10 text-status-urgent",
  attention: "bg-status-attention/10 text-status-attention",
  normal: "bg-status-normal/10 text-status-normal",
  inactive: "bg-status-inactive/10 text-status-inactive",
  info: "bg-status-info/10 text-status-info",
  // Solid (not the /10-opacity tint the others use) — reserved for a
  // status a source record explicitly stated as "critical" (Redesign
  // Lab Results Spec, Section 20: "strong warning treatment" for
  // Critical only, everything else stays subtle).
  critical: "bg-status-urgent text-white",
} as const;

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}>
      {children}
    </span>
  );
}
