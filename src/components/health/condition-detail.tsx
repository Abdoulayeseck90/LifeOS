"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Condition, Medication, MonitoringItem } from "@/types/health/entities";
import type { Document } from "@/types/core/entities";
import { ConditionStatusBadge } from "@/components/health/condition-status-badge";
import { LoadingState } from "@/components/core/loading-state";

type CrossReferences = { medications: Medication[]; monitoringItems: MonitoringItem[]; documents: Document[] };

export function ConditionDetail({ condition }: { condition: Condition }) {
  const t = useTranslations("conditions");
  const [crossRefs, setCrossRefs] = useState<CrossReferences | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCrossRefs(null);
    setError(false);

    fetch(`/api/health/conditions/${condition.id}/cross-references`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setCrossRefs(body.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [condition.id]);

  const fields: Array<[string, string | null]> = [
    [t("diagnosisDate"), condition.diagnosis_date],
    [t("provider"), condition.provider_reference],
    [t("form.description"), condition.description],
    [t("form.notes"), condition.notes],
  ];

  return (
    <div className="flex flex-col gap-4">
      <ConditionStatusBadge status={condition.status} />

      {fields
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="whitespace-pre-wrap text-secondary">{value}</p>
          </div>
        ))}

      <div className="border-t border-surface pt-4">
        {error ? (
          <p className="text-sm text-status-urgent">{t("crossReferenceError")}</p>
        ) : !crossRefs ? (
          <LoadingState />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t("relatedMedications")}
              </p>
              {crossRefs.medications.length === 0 ? (
                <p className="text-sm text-muted">{t("noneLinked")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {crossRefs.medications.map((medication) => (
                    <li key={medication.id} className="text-sm text-secondary">
                      {medication.name}
                      {medication.dose ? ` — ${medication.dose}${medication.unit ? ` ${medication.unit}` : ""}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t("relatedMonitoring")}
              </p>
              {crossRefs.monitoringItems.length === 0 ? (
                <p className="text-sm text-muted">{t("noneLinked")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {crossRefs.monitoringItems.map((item) => (
                    <li key={item.id} className="text-sm text-secondary">
                      {item.name}
                      {item.next_due_at && (
                        <span className="text-muted">
                          {" "}
                          — {t("nextDue")} {item.next_due_at}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t("relatedDocuments")}
              </p>
              {crossRefs.documents.length === 0 ? (
                <p className="text-sm text-muted">{t("noneLinked")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {crossRefs.documents.map((document) => (
                    <li key={document.id} className="text-sm text-secondary">
                      {document.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
