import type { LucideIcon } from "lucide-react";

// Visual Hierarchy Redesign spec, Section 3: "do not place icons
// randomly beside text" — a small icon container with a subtle
// category-tinted background. Deliberately limited to the 5 categories
// the spec itself names (Section 15: "avoid... multiple competing
// accent colors") — anything else (Conditions, Monitoring, Symptoms,
// Exercise, Nutrition, Timeline...) uses the neutral tint rather than
// inventing a new color per module.
export type IconCategory = "vitals" | "labs" | "medications" | "appointments" | "documents" | "neutral";

const CATEGORY_CLASSES: Record<IconCategory, string> = {
  vitals: "bg-primary/10 text-primary",
  labs: "bg-blue-50 text-blue-600",
  medications: "bg-purple-50 text-purple-600",
  appointments: "bg-orange-50 text-orange-600",
  documents: "bg-slate-100 text-slate-600",
  neutral: "bg-surface text-muted",
};

export function CategoryIcon({
  icon: Icon,
  category = "neutral",
  size = "md",
}: {
  icon: LucideIcon;
  category?: IconCategory;
  size?: "sm" | "md";
}) {
  const boxSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <div className={`flex ${boxSize} shrink-0 items-center justify-center rounded-lg ${CATEGORY_CLASSES[category]}`}>
      <Icon size={iconSize} />
    </div>
  );
}
