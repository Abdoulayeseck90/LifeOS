// The one LifeOS brand mark — the provided icon asset (navy rounded-
// square, teal "L", teal dot), used exactly as-is everywhere. Never
// redrawn, never replaced with a generic icon. Two pre-made variants
// ship in public/icons/: "dark" (navy square) reads on light
// backgrounds, "light" (near-white square) reads on dark backgrounds —
// this component just picks the right file for where it's placed
// (e.g. the now dark-navy AppSidebar) rather than one context guessing
// wrong against the other's background.
export function Logo({
  size = 28,
  withWordmark = false,
  onDark = false,
}: {
  size?: number;
  withWordmark?: boolean;
  onDark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- a static local
          brand SVG, not a content image; no optimization pipeline needed. */}
      <img
        src={onDark ? "/icons/app-icon-light.svg" : "/icons/app-icon-dark.svg"}
        alt="LifeOS"
        width={size}
        height={size}
        className="shrink-0 rounded-md"
      />
      {withWordmark && (
        <span className={`text-lg font-semibold ${onDark ? "text-white" : "text-secondary"}`}>LifeOS</span>
      )}
    </span>
  );
}
