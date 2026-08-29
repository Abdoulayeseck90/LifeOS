// Shared progress indicator (Expand Nutrition spec, Section 16: "use
// clean visual indicators... use semantic colors carefully, do NOT
// turn everything green/red"). `direction` distinguishes an "at least"
// target (fiber, fruit & veg — under-target is just progress, never
// alarming) from an "at most" limit (salt, free sugar — over-target
// gets the one subtle amber cue, everything else stays teal).
export function ProgressBar({
  value,
  target,
  direction = "atLeast",
}: {
  value: number;
  target: number;
  direction?: "atLeast" | "atMost";
}) {
  const ratio = target > 0 ? value / target : 0;
  const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const overLimit = direction === "atMost" && ratio > 1;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={target}
      className="h-2 w-full overflow-hidden rounded-full bg-surface"
    >
      <div className={`h-full rounded-full ${overLimit ? "bg-status-attention" : "bg-primary"}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
