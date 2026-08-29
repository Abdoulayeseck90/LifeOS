import { useTranslations } from "next-intl";
import type { SymptomEntry } from "@/types/health/entities";

export function SymptomDetail({ entry }: { entry: SymptomEntry }) {
  const t = useTranslations("symptoms.form");

  const fields: Array<[string, string | null]> = [
    [t("severity"), entry.severity !== null ? `${entry.severity}/10` : null],
    [t("onset"), entry.onset],
    [t("duration"), entry.duration],
    [t("frequency"), entry.frequency],
    [t("context"), entry.context],
    [t("notes"), entry.notes],
  ];

  return (
    <div className="flex flex-col gap-4">
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
