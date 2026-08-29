import { useTranslations } from "next-intl";
import type { Condition } from "@/types/health/entities";

// Maps condition status to the semantic status colors defined in
// tailwind.config.ts (Spec Section 51.4.1) — never a raw hex value here.
const STATUS_CLASSES: Record<Condition["status"], string> = {
  active: "bg-status-attention/10 text-status-attention",
  monitoring: "bg-status-attention/10 text-status-attention",
  resolved: "bg-status-normal/10 text-status-normal",
};

export function ConditionStatusBadge({ status }: { status: Condition["status"] }) {
  const t = useTranslations("conditions.status");

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {t(status)}
    </span>
  );
}
