import { getTranslations } from "next-intl/server";
import { listConditions } from "@/services/health/conditions";
import { ConditionCard } from "@/components/health/condition-card";
import { ConditionAddButton } from "@/components/health/condition-add-button";

// Data-first page (Global Data-Entry UX Refactor) — brought to parity
// with every other Health entity (was previously the one page still
// using the old always-visible form). Per-user data behind auth — never
// statically prerendered.
export const dynamic = "force-dynamic";

export default async function ConditionsPage() {
  const t = await getTranslations("conditions");
  const conditions = await listConditions();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <ConditionAddButton />
      </div>

      {conditions.length === 0 ? (
        <div className="rounded-card border border-dashed border-surface p-8 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conditions.map((condition) => (
            <ConditionCard key={condition.id} condition={condition} />
          ))}
        </div>
      )}
    </div>
  );
}
