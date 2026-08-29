import { useTranslations } from "next-intl";
import type { Medication } from "@/types/health/entities";

// Maps medication status to the semantic status colors defined in
// tailwind.config.ts (Spec Section 51.4.1) — never a raw hex value here.
const STATUS_CLASSES: Record<Medication["status"], string> = {
  active: "bg-status-normal/10 text-status-normal",
  planned: "bg-status-attention/10 text-status-attention",
  discontinued: "bg-status-inactive/10 text-status-inactive",
};

export function MedicationStatusBadge({ status }: { status: Medication["status"] }) {
  const t = useTranslations("medications.status");

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {t(status)}
    </span>
  );
}
