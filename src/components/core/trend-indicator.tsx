// Visual Hierarchy Redesign spec, Section 7/20: the one shared ↑/↓/→
// trend line, replacing the hand-duplicated version of this same
// pattern across body-metric-latest-card.tsx, vital-latest-card.tsx,
// the Health Overview page, and the Lab Test History "Compare" block.
//
// Deliberately NOT colored by default (Section 7: "Do not label a
// change as medically better or worse unless clinically validated —
// simply communicate the numerical change") — a caller only opts into
// directional coloring when there's an established, deliberate
// convention for that specific metric (Weight's existing "down is
// good" framing is the one case in this app; nothing else should pass
// a non-"neutral" convention without the same care).
export type TrendColorConvention = "neutral" | "downIsPositive" | "upIsPositive";

function toneClass(delta: number, convention: TrendColorConvention): string {
  if (convention === "neutral" || delta === 0) return "text-muted";
  const isUp = delta > 0;
  const isPositive = convention === "downIsPositive" ? !isUp : isUp;
  return isPositive ? "text-status-normal" : "text-status-attention";
}

export function TrendIndicator({
  delta,
  unit,
  caption,
  colorConvention = "neutral",
}: {
  delta: number;
  unit?: string | null;
  caption: string;
  colorConvention?: TrendColorConvention;
}) {
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <p className={`mt-1 text-xs ${toneClass(delta, colorConvention)}`}>
      {arrow} {Math.abs(delta)}
      {unit ? ` ${unit}` : ""} {caption}
    </p>
  );
}
