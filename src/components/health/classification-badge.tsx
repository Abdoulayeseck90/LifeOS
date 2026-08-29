import { useTranslations } from "next-intl";
import { CircleCheck, Scale, AlertTriangle, Info } from "lucide-react";
import type { FoodClassification } from "@/lib/health/classification";

// Redesign Nutrition spec, Section 6/20: the one shared classification
// badge for both food cards and meal cards (via mealRatingToClassification)
// — Lucide icons, not emoji, and never a "good food/bad food" framing.
const CLASSIFICATION_CONFIG: Record<FoodClassification, { icon: typeof CircleCheck; className: string }> = {
  prioritize: { icon: CircleCheck, className: "bg-status-normal/10 text-status-normal" },
  moderation: { icon: Scale, className: "bg-status-attention/10 text-status-attention" },
  limit: { icon: AlertTriangle, className: "bg-status-urgent/10 text-status-urgent" },
  info: { icon: Info, className: "bg-status-info/10 text-status-info" },
};

export function ClassificationBadge({ classification }: { classification: FoodClassification }) {
  const t = useTranslations("nutrition.classification");
  const { icon: Icon, className } = CLASSIFICATION_CONFIG[classification];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon size={12} />
      {t(classification)}
    </span>
  );
}
