import { getTranslations } from "next-intl/server";
import { listMonitoringPlans, listMonitoringItems, listGuidelines } from "@/services/health/monitoring";
import { listConditions } from "@/services/health/conditions";
import { MonitoringPlanAddButton } from "@/components/health/monitoring-plan-add-button";
import { MonitoringDashboardSummary } from "@/components/health/monitoring-dashboard-summary";
import { MonitoringTabs } from "@/components/health/monitoring-tabs";
import { MonitoringPlansTab } from "@/components/health/monitoring-plans-tab";

// Per-user data behind auth — never statically prerendered.
export const dynamic = "force-dynamic";

// Reorganized into Overview (overdue/due-soon/upcoming/recently
// completed dashboard) / Plans (the full plan/item CRUD list) tabs,
// same pattern as Nutrition/Vitals/Exercise, instead of one long
// stacked scroll.
export default async function MonitoringPage() {
  const t = await getTranslations("monitoring");
  const [plans, items, conditions, guidelines] = await Promise.all([
    listMonitoringPlans(),
    listMonitoringItems(),
    listConditions(),
    listGuidelines(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
        <MonitoringPlanAddButton conditions={conditions} />
      </div>

      <MonitoringTabs
        overview={<MonitoringDashboardSummary items={items} />}
        plans={<MonitoringPlansTab plans={plans} items={items} guidelines={guidelines} />}
      />
    </div>
  );
}
