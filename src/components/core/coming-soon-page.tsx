// Master Redesign Section 6: a polished, honest placeholder for modules
// that exist in navigation but aren't built yet — never a fake
// dashboard or an empty table that reads as broken.
export function ComingSoonPage({
  title,
  description,
  features,
  badge,
}: {
  title: string;
  description: string;
  features: string[];
  badge: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-secondary">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-muted">{description}</p>

      <ul className="mt-6 flex max-w-sm flex-col gap-2 text-left">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-secondary">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {feature}
          </li>
        ))}
      </ul>

      <span className="mt-8 rounded-full border border-dashed border-surface px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
        {badge}
      </span>
    </div>
  );
}
