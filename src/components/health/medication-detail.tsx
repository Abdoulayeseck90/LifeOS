import { useTranslations } from "next-intl";
import type { Medication } from "@/types/health/entities";
import { MedicationStatusBadge } from "@/components/health/medication-status-badge";

export function MedicationDetail({ medication }: { medication: Medication }) {
  const t = useTranslations("medications.form");

  const fields: Array<[string, string | null]> = [
    [t("dose"), [medication.dose, medication.unit].filter(Boolean).join(" ") || null],
    [t("frequency"), medication.frequency],
    [t("route"), medication.route],
    [t("startDate"), medication.start_date],
    [t("endDate"), medication.end_date],
    [t("prescriber"), medication.prescriber],
    [t("reason"), medication.reason],
    [t("instructions"), medication.instructions],
  ];

  return (
    <div className="flex flex-col gap-4">
      <MedicationStatusBadge status={medication.status} />
      {fields
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="whitespace-pre-wrap text-secondary">{value}</p>
          </div>
        ))}
    </div>
  );
}
