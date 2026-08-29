import { getTranslations } from "next-intl/server";
import type { MonitoringPlan, MonitoringItem, Guideline } from "@/types/health/entities";
import type { MonitoringItemWithGuideline } from "@/services/health/monitoring";
import { MonitoringItemAddButton } from "@/components/health/monitoring-item-add-button";
import { MonitoringPlanDeleteButton } from "@/components/health/monitoring-plan-delete-button";
import { MonitoringItemDeleteButton } from "@/components/health/monitoring-item-delete-button";
import { MonitoringStatusBadge, MonitoringSourceBadge } from "@/components/health/monitoring-status-badge";
import { MonitoringItemActions } from "@/components/health/monitoring-item-actions";

function formatFrequency(
  item: Pick<MonitoringItem, "interval_value" | "interval_unit" | "frequency_note">,
  unitLabels: Record<string, string>
) {
  if (item.interval_value && item.interval_unit) {
    return `${unitLabels.every} ${item.interval_value} ${unitLabels[item.interval_unit]}`;
  }
  return item.frequency_note;
}

// Monitoring redesign — Plans tab: "manage everything," relocated
// unchanged from the old single-scroll page (Overview now owns the
// overdue/due-soon/upcoming/recently-completed dashboard).
export async function MonitoringPlansTab({
  plans,
  items,
  guidelines,
}: {
  plans: MonitoringPlan[];
  items: MonitoringItemWithGuideline[];
  guidelines: Guideline[];
}) {
  const t = await getTranslations("monitoring");

  const unitLabels = {
    every: t("frequency.every"),
    days: t("frequency.days"),
    weeks: t("frequency.weeks"),
    months: t("frequency.months"),
    years: t("frequency.years"),
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-surface p-8 text-center">
        <p className="text-sm text-muted">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {plans.map((plan) => {
        const planItems = items.filter((item) => item.monitoring_plan_id === plan.id);

        return (
          <div key={plan.id} className="rounded-card border border-surface bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-secondary">{plan.name}</p>
                {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
              </div>
              <MonitoringPlanDeleteButton planId={plan.id} />
            </div>

            <div className="mt-4">
              <MonitoringItemAddButton planId={plan.id} guidelines={guidelines} />
            </div>

            {planItems.length === 0 ? (
              <p className="text-sm text-muted">{t("emptyItems")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {planItems.map((item) => (
                  <div key={item.id} className="rounded border border-surface p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-secondary">{item.name}</p>
                        <p className="mt-1 text-xs text-muted">{formatFrequency(item, unitLabels) ?? t("noSchedule")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MonitoringSourceBadge source={item.source} />
                        <MonitoringStatusBadge item={item} />
                      </div>
                    </div>

                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                      {item.next_due_at && (
                        <div>
                          <dt className="text-xs text-muted">{t("nextDue")}</dt>
                          <dd className="text-secondary">{item.next_due_at}</dd>
                        </div>
                      )}
                      {item.last_completed_at && (
                        <div>
                          <dt className="text-xs text-muted">{t("lastCompleted")}</dt>
                          <dd className="text-secondary">{item.last_completed_at}</dd>
                        </div>
                      )}
                    </dl>

                    {item.guidelines && (
                      <p className="mt-2 text-xs italic text-muted">
                        {t("guidelineCitation", { organization: item.guidelines.organization, title: item.guidelines.title })}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      {item.status === "active" && <MonitoringItemActions itemId={item.id} />}
                      <MonitoringItemDeleteButton itemId={item.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
