import { getTranslations } from "next-intl/server";
import { listMedications } from "@/services/health/medications";
import { listConditions } from "@/services/health/conditions";
import { MedicationCard } from "@/components/health/medication-card";
import { MedicationAddButton } from "@/components/health/medication-add-button";

// Data-first page. Per-user data behind auth — never statically
// prerendered.
export const dynamic = "force-dynamic";

export default async function MedicationsPage() {
  const t = await getTranslations("medications");
  const [medications, conditions] = await Promise.all([listMedications(), listConditions()]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <MedicationAddButton conditions={conditions} />
      </div>

      {medications.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {medications.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} conditions={conditions} />
          ))}
        </div>
      )}
    </div>
  );
}
